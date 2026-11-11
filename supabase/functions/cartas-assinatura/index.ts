import "jsr:@supabase/functions-js/edge-runtime.d.ts";
import { createClient } from "jsr:@supabase/supabase-js@2";
import { PDFDocument, StandardFonts, rgb } from "npm:pdf-lib@1.17.1";
import { pdflibAddPlaceholder } from "npm:@signpdf/placeholder-pdf-lib@4.0.0";
import { P12Signer } from "npm:@signpdf/signer-p12@4.0.0";
import { SignPdf } from "npm:@signpdf/signpdf@4.0.0";
import { Buffer } from "node:buffer";
import forge from "npm:node-forge@1.4.3";

const cors = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type",
  "Access-Control-Allow-Methods": "POST, OPTIONS"
};
const reply = (body: Record<string, unknown>, status = 200) => new Response(JSON.stringify(body), {
  status, headers: { ...cors, "Content-Type": "application/json", "Cache-Control": "no-store" }
});
const text = (v: unknown) => String(v ?? "").trim();
const htmlText = (value: unknown) => String(value ?? "")
  .replace(/<\s*br\s*\/?\s*>/gi, "\n")
  .replace(/<\/(?:p|div|li|footer|hr)\s*>/gi, "\n")
  .replace(/<li\b[^>]*>/gi, "• ")
  .replace(/<[^>]*>/g, "")
  .replace(/&nbsp;/gi, " ").replace(/&amp;/gi, "&").replace(/&lt;/gi, "<").replace(/&gt;/gi, ">")
  .replace(/&quot;/gi, '"').replace(/&#0*39;/gi, "'").replace(/&#x([\da-f]+);/gi, (_match, code) => String.fromCodePoint(parseInt(code, 16)));
const decode64 = (value: string) => Uint8Array.from(atob(value), c => c.charCodeAt(0));
const readPfx = async (payload: Record<string, unknown>) => {
  const file = payload.pfx_file;
  if (file instanceof File) return new Uint8Array(await file.arrayBuffer());
  return decode64(text(payload.pfx));
};
const encode64 = (value: Uint8Array) => {
  let binary = "";
  for (let offset = 0; offset < value.length; offset += 0x8000) binary += String.fromCharCode(...value.subarray(offset, offset + 0x8000));
  return btoa(binary);
};

type TipoCertificado = "ecpf" | "ecnpj";
const oidTitular = { ecpf: "2.16.76.1.3.1", ecnpj: "2.16.76.1.3.3" };

function normalizarDocumento(value: unknown, tipo: TipoCertificado) {
  const documento = text(value);
  const formato = tipo === "ecpf" ? /^(?:\d{11}|\d{3}\.\d{3}\.\d{3}-\d{2})$/ : /^(?:\d{14}|\d{2}\.\d{3}\.\d{3}\/\d{4}-\d{2})$/;
  return formato.test(documento) ? documento.replace(/\D/g, "") : "";
}

function lerIdentificadorIcp(certificate: any, tipo: TipoCertificado) {
  const extensaoSan = certificate.extensions?.find((extension: any) => extension.id === "2.5.29.17");
  if (typeof extensaoSan?.value !== "string") return "";
  const { Class, Type, fromDer, derToOid } = forge.asn1;
  try {
    const san = fromDer(extensaoSan.value);
    if (!Array.isArray(san.value)) return "";
    for (const otherName of san.value) {
      if (otherName.tagClass !== Class.CONTEXT_SPECIFIC || otherName.type !== 0 || !Array.isArray(otherName.value)) continue;
      let campos = otherName.value;
      const primeiro = campos[0];
      if (campos.length === 1 && primeiro?.tagClass === Class.UNIVERSAL && primeiro.type === Type.SEQUENCE && Array.isArray(primeiro.value)) campos = primeiro.value;
      const [oid, wrapper] = campos;
      if (oid?.tagClass !== Class.UNIVERSAL || oid.type !== Type.OID || typeof oid.value !== "string" || derToOid(oid.value) !== oidTitular[tipo]) continue;
      if (wrapper?.tagClass !== Class.CONTEXT_SPECIFIC || wrapper.type !== 0 || !Array.isArray(wrapper.value)) continue;
      const valor = wrapper.value[0];
      if (valor?.tagClass !== Class.UNIVERSAL || typeof valor.value !== "string" ||
          ![Type.OCTETSTRING, Type.UTF8, Type.PRINTABLESTRING, Type.IA5STRING].includes(valor.type)) continue;

      // O otherName de pessoa física começa com 8 posições de nascimento e 11 de CPF.
      const documento = tipo === "ecpf" ? valor.value.slice(8, 19) : valor.value;
      const identificador = normalizarDocumento(documento, tipo);
      if (identificador) return identificador;
    }
  } catch {
    return "";
  }
  return "";
}

function lerCertificado(rawPfx: Uint8Array, passphrase: string, tipoSolicitado: string) {
  if (tipoSolicitado && tipoSolicitado !== "ecpf" && tipoSolicitado !== "ecnpj") throw new Error("Selecione se o certificado é e-CPF ou e-CNPJ.");
  let p12Asn1: any;
  try {
    p12Asn1 = forge.asn1.fromDer(Buffer.from(rawPfx).toString("binary"), true, { parseAllBytes: true });
  } catch {
    throw new Error("O arquivo não é um PFX/P12 válido ou está danificado.");
  }

  let p12: any;
  try {
    p12 = forge.pkcs12.pkcs12FromAsn1(p12Asn1, false, passphrase);
  } catch {
    throw new Error("Não foi possível abrir o PFX. Confira a senha e tente exportar novamente o certificado no formato PFX/P12.");
  }

  let certBags: Array<{ cert?: any }> = [];
  let keyBags: Array<{ key?: any }> = [];
  try {
    certBags = p12.getBags({ bagType: forge.pki.oids.certBag })[forge.pki.oids.certBag] || [];
    const shrouded = p12.getBags({ bagType: forge.pki.oids.pkcs8ShroudedKeyBag })[forge.pki.oids.pkcs8ShroudedKeyBag] || [];
    const unencrypted = p12.getBags({ bagType: forge.pki.oids.keyBag })[forge.pki.oids.keyBag] || [];
    keyBags = [...shrouded, ...unencrypted];
  } catch {
    throw new Error("A criptografia interna deste PFX não é compatível com a validação atual.");
  }

  const privateKey = keyBags.find(bag => bag.key)?.key;
  if (!privateKey) throw new Error("O PFX foi aberto, mas não contém uma chave privada compatível. Exporte o certificado incluindo a chave privada.");
  if (!privateKey.n || !privateKey.e) throw new Error("A chave deste certificado não é RSA; a assinatura de PDF desta área requer uma chave RSA.");
  const certificate = certBags.map(bag => bag.cert).find(cert =>
    cert?.publicKey?.n?.compareTo(privateKey.n) === 0 && cert?.publicKey?.e?.compareTo(privateKey.e) === 0
  );
  if (!certificate) throw new Error("A chave privada do PFX não corresponde a nenhum certificado incluído no arquivo.");
  const serialFields = certificate.subject.attributes.filter((attribute: { type: string }) => attribute.type === "2.5.4.5");
  const lerDocumentoTitular = (esperado: TipoCertificado) =>
    serialFields.some((field: { value: unknown }) => normalizarDocumento(field.value, esperado)) || Boolean(lerIdentificadorIcp(certificate, esperado));
  const nomeComum = text(certificate.subject.getField("CN")?.value);
  const tipos: TipoCertificado[] = ["ecpf", "ecnpj"];
  let tiposIdentificados = tipos.filter(lerDocumentoTitular);
  if (!tiposIdentificados.length) {
    // Alguns certificados da cadeia da Receita Federal terminam o CN em :CPF ou :CNPJ.
    const sufixo = nomeComum.match(/:\s*([\d./-]+)$/)?.[1];
    tiposIdentificados = tipos.filter(esperado => normalizarDocumento(sufixo, esperado));
  }
  if (!tiposIdentificados.length) throw new Error("O PFX foi aberto, mas não foi possível localizar o CPF ou CNPJ do titular nos campos do certificado.");
  const tipo = tipoSolicitado || (tiposIdentificados.length === 1 ? tiposIdentificados[0] : undefined);
  if (!tipo) throw new Error("O PFX contém mais de um tipo de documento do titular. Selecione se o certificado é e-CPF ou e-CNPJ.");
  if (!tiposIdentificados.includes(tipo)) throw new Error(`O certificado contém ${tiposIdentificados[0] === "ecpf" ? "CPF" : "CNPJ"} de titular. Confira o tipo selecionado.`);
  const titular = (nomeComum || "Titular do certificado").slice(0, 180);
  const validity = certificate.validity.notAfter.toISOString();
  const fingerprintDigest = forge.md.sha256.create();
  fingerprintDigest.update(forge.asn1.toDer(forge.pki.certificateToAsn1(certificate)).getBytes(), "raw");
  return { tipo, titular, validade_ate: validity, fingerprint: fingerprintDigest.digest().toHex() };
}

async function gerarPdfCarta(document: Record<string, unknown>) {
  const pdf = await PDFDocument.create();
  const font = await pdf.embedFont(StandardFonts.Helvetica);
  const bold = await pdf.embedFont(StandardFonts.HelveticaBold);
  const margin = 58;
  const color = rgb(0.12, 0.16, 0.22);
  let page = pdf.addPage([595.28, 841.89]);
  let y = 760;
  const nextPage = () => { page = pdf.addPage([595.28, 841.89]); y = 770; };
  const writeRich = (value: string) => {
    const stack: Array<{ bold: boolean; size: number; color: ReturnType<typeof rgb> }> = [{ bold: false, size: 12, color }];
    let x = margin;
    let lineHeight = 18;
    const finishLine = () => { if (x > margin) y -= lineHeight; x = margin; lineHeight = 18; };
    const drawWords = (raw: string) => {
      const decoded = htmlText(raw).replace(/\s+/g, " ");
      for (const word of decoded.split(" ").filter(Boolean)) {
        const style = stack[stack.length - 1];
        const face = style.bold ? bold : font;
        const size = style.size;
        const candidate = `${x > margin ? " " : ""}${word}`;
        const width = face.widthOfTextAtSize(candidate, size);
        if (x > margin && x + width > 537) finishLine();
        if (y < 70) nextPage();
        const prefix = x > margin ? " " : "";
        page.drawText(`${prefix}${word}`, { x, y, size, font: face, color: style.color });
        x += face.widthOfTextAtSize(`${prefix}${word}`, size);
        lineHeight = Math.max(lineHeight, size * 1.55);
      }
    };
    for (const token of value.match(/<[^>]*>|[^<]+/g) || []) {
      if (!token.startsWith("<")) { drawWords(token); continue; }
      const tag = token.match(/^<\s*(\/?)\s*([a-z0-9]+)/i);
      if (!tag) continue;
      const closing = Boolean(tag[1]);
      const name = tag[2].toLowerCase();
      if (closing) {
        if (["p", "div", "li", "footer", "hr"].includes(name)) finishLine();
        if (stack.length > 1) stack.pop();
        continue;
      }
      if (["br", "hr"].includes(name)) { finishLine(); continue; }
      const current = stack[stack.length - 1];
      const next = { ...current, bold: current.bold || ["strong", "b"].includes(name) };
      const size = token.match(/font-size\s*:\s*(\d+(?:\.\d+)?)\s*(px|pt|em)/i);
      if (size) next.size = Math.max(8, Math.min(24, Number(size[1]) * (size[2].toLowerCase() === "px" ? 0.75 : size[2].toLowerCase() === "em" ? 12 : 1)));
      const fontSize = token.match(/\bsize=["']?([1-7])/i);
      if (fontSize) next.size = [8, 9, 10, 12, 14, 18, 22][Number(fontSize[1]) - 1];
      const hex = token.match(/(?:color\s*:\s*|\bcolor=["']?)(#[\da-f]{6})/i)?.[1];
      if (hex) next.color = rgb(parseInt(hex.slice(1, 3), 16) / 255, parseInt(hex.slice(3, 5), 16) / 255, parseInt(hex.slice(5, 7), 16) / 255);
      stack.push(next);
    }
    finishLine();
  };
  const html = String(document.corpo ?? "");
  const logoUrl = html.match(/<img\b[^>]*\bsrc=["'](https:\/\/[^"']+)["']/i)?.[1];
  if (logoUrl) {
    try {
      const requested = new URL(logoUrl);
      const configured = new URL(text(Deno.env.get("SUPABASE_URL")));
      if (requested.origin === configured.origin) {
        const response = await fetch(requested, { signal: AbortSignal.timeout(5000) });
        const contentType = response.headers.get("content-type") || "";
        const bytes = new Uint8Array(await response.arrayBuffer());
        if (response.ok && bytes.length <= 2 * 1024 * 1024) {
          const image = contentType.includes("png") ? await pdf.embedPng(bytes) : contentType.includes("jpeg") || contentType.includes("jpg") ? await pdf.embedJpg(bytes) : null;
          if (image) {
            const scale = Math.min(190 / image.width, 70 / image.height, 1);
            page.drawImage(image, { x: (595.28 - image.width * scale) / 2, y: 765, width: image.width * scale, height: image.height * scale });
            y = 735;
          }
        }
      }
    } catch { /* Logo indisponível: a carta segue com o texto e os dados da corretora. */ }
  }
  writeRich(html.replace(/<img\b[^>]*>/gi, ""));
  if (y < 56) nextPage(); else y -= 18;
  page.drawText(`Emitido em ${new Date().toLocaleDateString("pt-BR")}`, { x: margin, y, size: 10, font, color: rgb(0.4, 0.44, 0.5) });
  return new Uint8Array(await pdf.save({ useObjectStreams: false }));
}

function encryptionKey() {
  const encoded = text(Deno.env.get("CARTAS_ENCRYPTION_KEY"));
  if (!encoded) throw new Error("A chave de criptografia da área Cartas não está configurada.");
  const raw = decode64(encoded);
  if (raw.length !== 32) throw new Error("A chave de criptografia da área Cartas deve ter 32 bytes em Base64.");
  return crypto.subtle.importKey("raw", raw, "AES-GCM", false, ["encrypt", "decrypt"]);
}

async function encrypt(value: Uint8Array) {
  const iv = crypto.getRandomValues(new Uint8Array(12));
  const key = await encryptionKey();
  const encrypted = new Uint8Array(await crypto.subtle.encrypt({ name: "AES-GCM", iv }, key, value));
  const packed = new Uint8Array(iv.length + encrypted.length);
  packed.set(iv); packed.set(encrypted, iv.length);
  return packed;
}

async function decrypt(value: Uint8Array) {
  const iv = value.slice(0, 12);
  const cipher = value.slice(12);
  const key = await encryptionKey();
  return new Uint8Array(await crypto.subtle.decrypt({ name: "AES-GCM", iv }, key, cipher));
}

Deno.serve(async request => {
  if (request.method === "OPTIONS") return new Response("ok", { headers: cors });
  if (request.method !== "POST") return reply({ error: "Método não permitido." }, 405);
  const url = text(Deno.env.get("SUPABASE_URL"));
  const anon = text(Deno.env.get("SUPABASE_ANON_KEY"));
  const service = text(Deno.env.get("SUPABASE_SERVICE_ROLE_KEY"));
  const authorization = text(request.headers.get("Authorization"));
  const token = authorization.match(/^Bearer\s+(.+)$/i)?.[1] || "";
  if (!url || !anon || !service || !token) return reply({ error: "Sessão inválida ou serviço não configurado." }, 401);

  const userClient = createClient(url, anon, { global: { headers: { Authorization: authorization } }, auth: { persistSession: false, autoRefreshToken: false } });
  const { data: auth, error: authError } = await userClient.auth.getUser(token);
  if (authError || !auth.user) return reply({ error: "Entre novamente no Hub." }, 401);
  let payload: Record<string, unknown>;
  try {
    if (request.headers.get("content-type")?.toLowerCase().includes("multipart/form-data")) {
      const form = await request.formData();
      const certificateValue = form.get("certificate");
      payload = {
        action: form.get("action"),
        certificate: certificateValue ? JSON.parse(String(certificateValue)) : undefined,
        certificado_id: form.get("certificado_id"),
        pfx_file: form.get("pfx"),
        senha: form.get("senha"),
        tipo: form.get("tipo")
      };
    } else {
      payload = await request.json();
    }
  } catch { return reply({ error: "Solicitação inválida." }, 400); }
  const action = text(payload.action);
  const permission = ["upload_certificate", "update_certificate"].includes(action) ? "manage_certificate" : action === "sign_document" ? "sign" : action === "deactivate_certificate" ? "delete" : "view";
  const { data: allowed, error: permissionError } = await userClient.rpc("app_tem_permissao", { p_recurso: "operacoes.cartas", p_acao: permission });
  if (permissionError || allowed !== true) return reply({ error: "Seu perfil não tem permissão para esta ação." }, 403);

  const admin = createClient(url, service, { auth: { persistSession: false, autoRefreshToken: false } });
  const log = (tipo: string, values: Record<string, unknown>) => admin.from("cartas_auditoria").insert({ tipo, auth_uid: auth.user.id, detalhes: values });
  try {
    if (action === "upload_certificate") {
      const certificate = payload.certificate as Record<string, unknown> | undefined;
      const rawPfx = await readPfx(payload);
      const passphrase = String(payload.senha ?? "");
      if (!certificate || rawPfx.length < 100 || rawPfx.length > 5 * 1024 * 1024 || !passphrase || passphrase.length > 512) return reply({ error: "Arquivo PFX ou senha inválidos. O limite do arquivo é 5 MB." }, 400);
      if (!text(certificate.nome) || text(certificate.nome).length > 120) return reply({ error: "Informe um nome de identificação válido para o certificado." }, 400);
      let metadata: ReturnType<typeof lerCertificado>;
      try {
        metadata = lerCertificado(rawPfx, passphrase, text(payload.tipo));
        if (new Date(metadata.validade_ate).getTime() <= Date.now()) return reply({ error: "O certificado PFX já está vencido." }, 400);
      } catch (error) { return reply({ error: error instanceof Error ? error.message : "Falha ao validar o PFX." }, 400); }
      const id = crypto.randomUUID();
      const pfxPath = `certificados/${id}/arquivo.enc`;
      const passPath = `certificados/${id}/senha.enc`;
      const [encryptedPfx, encryptedPassword] = await Promise.all([encrypt(rawPfx), encrypt(new TextEncoder().encode(passphrase))]);
      const [pfxUpload, passUpload] = await Promise.all([
        admin.storage.from("cartas-private").upload(pfxPath, encryptedPfx, { contentType: "application/octet-stream", upsert: false }),
        admin.storage.from("cartas-private").upload(passPath, encryptedPassword, { contentType: "application/octet-stream", upsert: false })
      ]);
      if (pfxUpload.error || passUpload.error) {
        await admin.storage.from("cartas-private").remove([pfxPath, passPath]);
        return reply({ error: "Não foi possível guardar o certificado com segurança." }, 500);
      }
      const { error } = await admin.from("cartas_certificados").insert({
        id, nome: text(certificate.nome), ...metadata,
        pfx_path: pfxPath, senha_path: passPath,
        enviado_por_auth_uid: auth.user.id, ativo: true
      });
      if (error) { await admin.storage.from("cartas-private").remove([pfxPath, passPath]); return reply({ error: "Falha ao registrar o certificado." }, 500); }
      await log("certificado_importado", { certificado_id: id, tipo: metadata.tipo, fingerprint: metadata.fingerprint });
      return reply({ ok: true, certificado_id: id, tipo: metadata.tipo });
    }

    if (action === "update_certificate") {
      const id = text(payload.certificado_id);
      const rawPfx = await readPfx(payload);
      const passphrase = String(payload.senha ?? "");
      if (!id || rawPfx.length < 100 || rawPfx.length > 5 * 1024 * 1024 || !passphrase || passphrase.length > 512) return reply({ error: "Arquivo PFX ou senha inválidos. O limite do arquivo é 5 MB." }, 400);
      let metadata: ReturnType<typeof lerCertificado>;
      try {
        metadata = lerCertificado(rawPfx, passphrase, text(payload.tipo));
        if (new Date(metadata.validade_ate).getTime() <= Date.now()) return reply({ error: "O certificado PFX já está vencido." }, 400);
      } catch (error) { return reply({ error: error instanceof Error ? error.message : "Falha ao validar o PFX." }, 400); }

      const { data: existing, error: lookupError } = await admin.from("cartas_certificados")
        .select("id,pfx_path,senha_path")
        .eq("id", id)
        .maybeSingle();
      if (lookupError || !existing) return reply({ error: "Certificado não encontrado para atualização." }, 404);

      const version = crypto.randomUUID();
      const pfxPath = `certificados/${id}/${version}/arquivo.enc`;
      const passPath = `certificados/${id}/${version}/senha.enc`;
      const [encryptedPfx, encryptedPassword] = await Promise.all([encrypt(rawPfx), encrypt(new TextEncoder().encode(passphrase))]);
      const [pfxUpload, passUpload] = await Promise.all([
        admin.storage.from("cartas-private").upload(pfxPath, encryptedPfx, { contentType: "application/octet-stream", upsert: false }),
        admin.storage.from("cartas-private").upload(passPath, encryptedPassword, { contentType: "application/octet-stream", upsert: false })
      ]);
      if (pfxUpload.error || passUpload.error) {
        await admin.storage.from("cartas-private").remove([pfxPath, passPath]);
        return reply({ error: "Não foi possível guardar o certificado atualizado com segurança." }, 500);
      }

      const { error: updateError } = await admin.from("cartas_certificados").update({
        ...metadata,
        pfx_path: pfxPath,
        senha_path: passPath,
        ativo: true,
        updated_at: new Date().toISOString()
      }).eq("id", id);
      if (updateError) {
        await admin.storage.from("cartas-private").remove([pfxPath, passPath]);
        return reply({ error: "Não foi possível atualizar os dados do certificado." }, 500);
      }

      const { error: cleanupError } = await admin.storage.from("cartas-private").remove([existing.pfx_path, existing.senha_path]);
      if (cleanupError) console.error("cartas-assinatura: não foi possível remover os arquivos anteriores do certificado", id);
      await log("certificado_atualizado", { certificado_id: id, tipo: metadata.tipo, fingerprint: metadata.fingerprint });
      return reply({ ok: true, certificado_id: id, tipo: metadata.tipo });
    }

    if (action === "deactivate_certificate") {
      const id = text(payload.certificado_id);
      const { error } = await admin.from("cartas_certificados").update({ ativo: false, updated_at: new Date().toISOString() }).eq("id", id).eq("ativo", true);
      if (error) return reply({ error: "Não foi possível desativar este certificado." }, 500);
      await log("certificado_desativado", { certificado_id: id });
      return reply({ ok: true });
    }

    if (action === "sign_document") {
      const confirmationPassword = String(payload.confirmacao_senha ?? "");
      if (!confirmationPassword || !auth.user.email) return reply({ error: "Informe sua senha do Hub para confirmar a assinatura." }, 401);
      const confirmationClient = createClient(url, anon, { auth: { persistSession: false, autoRefreshToken: false } });
      const { data: confirmation, error: confirmationError } = await confirmationClient.auth.signInWithPassword({
        email: auth.user.email,
        password: confirmationPassword
      });
      if (confirmationError || confirmation.user?.id !== auth.user.id) return reply({ error: "Não foi possível confirmar a senha do Hub. Confira a senha atual e tente novamente." }, 401);
      const id = text(payload.documento_id);
      const { data: document, error: docError } = await admin.from("cartas_documentos").select("*").eq("id", id).maybeSingle();
      if (docError || !document || document.status !== "rascunho") return reply({ error: "Carta não encontrada ou não está mais em rascunho." }, 404);
      const { data: certificate, error: certError } = await admin.from("cartas_certificados").select("*").eq("id", text(payload.certificado_id)).eq("ativo", true).maybeSingle();
      if (certError || !certificate) return reply({ error: "Cadastre um certificado ativo antes de assinar." }, 400);
      if (certificate.tipo === "ecpf" && certificate.enviado_por_auth_uid !== auth.user.id) return reply({ error: "O e-CPF só pode ser usado pelo usuário que o cadastrou." }, 403);
      if (certificate.validade_ate && new Date(certificate.validade_ate).getTime() <= Date.now()) return reply({ error: "O certificado selecionado está vencido." }, 400);
      const rawPdf = await gerarPdfCarta(document);
      const [pfxResult, passwordResult] = await Promise.all([
        admin.storage.from("cartas-private").download(certificate.pfx_path),
        admin.storage.from("cartas-private").download(certificate.senha_path)
      ]);
      if (pfxResult.error || passwordResult.error || !pfxResult.data || !passwordResult.data) return reply({ error: "Não foi possível carregar o certificado para assinatura." }, 500);
      const [pfx, password] = await Promise.all([pfxResult.data.arrayBuffer(), passwordResult.data.arrayBuffer()]);
      const passphrase = new TextDecoder().decode(await decrypt(new Uint8Array(password)));
      const pdfDocument = await PDFDocument.load(rawPdf);
      pdflibAddPlaceholder({ pdfDoc: pdfDocument, reason: "Assinatura digital de carta", contactInfo: "Operações - Cartas", name: certificate.titular, location: "Brasil", signatureLength: 24000, subFilter: "ETSI.CAdES.detached" });
      const pdfPlaceholder = await pdfDocument.save({ useObjectStreams: false });
      const signer = new P12Signer(Buffer.from(await decrypt(new Uint8Array(pfx))), { passphrase });
      const signed = await new SignPdf().sign(Buffer.from(pdfPlaceholder), signer);
      const signedBytes = new Uint8Array(signed);
      const path = `documentos/${id}/${crypto.randomUUID()}.pdf`;
      const upload = await admin.storage.from("cartas-private").upload(path, signedBytes, { contentType: "application/pdf", upsert: false });
      if (upload.error) return reply({ error: "Falha ao armazenar o documento assinado." }, 500);
      const digest = await crypto.subtle.digest("SHA-256", signedBytes);
      const sha256 = [...new Uint8Array(digest)].map(v => v.toString(16).padStart(2, "0")).join("");
      const { error: updateError } = await admin.from("cartas_documentos").update({ status: "assinado", arquivo_path: path, sha256, certificado_id: certificate.id, signatario_auth_uid: auth.user.id, assinado_em: new Date().toISOString(), updated_by: null, updated_at: new Date().toISOString() }).eq("id", id).eq("status", "rascunho");
      if (updateError) { await admin.storage.from("cartas-private").remove([path]); return reply({ error: "Não foi possível finalizar o registro da assinatura." }, 500); }
      await log("documento_assinado", { documento_id: id, certificado_id: certificate.id, sha256 });
      return reply({ ok: true, sha256 });
    }

    if (action === "download_document") {
      const { data: document, error } = await admin.from("cartas_documentos").select("arquivo_path,status").eq("id", text(payload.documento_id)).maybeSingle();
      if (error || !document || document.status !== "assinado" || !document.arquivo_path) return reply({ error: "Documento assinado não encontrado." }, 404);
      const { data: file, error: fileError } = await admin.storage.from("cartas-private").download(document.arquivo_path);
      if (fileError || !file) return reply({ error: "Não foi possível baixar o PDF assinado." }, 500);
      return reply({ pdf: encode64(new Uint8Array(await file.arrayBuffer())) });
    }
    return reply({ error: "Ação não reconhecida." }, 400);
  } catch (error) {
    console.error("cartas-assinatura: falha de processamento", error instanceof Error ? error.message : "erro interno");
    return reply({ error: error instanceof Error ? error.message : "Falha ao processar a solicitação." }, 400);
  }
});

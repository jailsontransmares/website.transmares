import "jsr:@supabase/functions-js/edge-runtime.d.ts";
import { createClient } from "jsr:@supabase/supabase-js@2";
import { PDFDocument, StandardFonts, rgb } from "npm:pdf-lib@1.17.1";
import { pdflibAddPlaceholder } from "npm:@signpdf/placeholder-pdf-lib@4.0.0";
import { P12Signer } from "npm:@signpdf/signer-p12@4.0.0";
import { SignPdf } from "npm:@signpdf/signpdf@4.0.0";
import { Buffer } from "node:buffer";
import forge from "npm:node-forge@1.3.3";

const cors = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type",
  "Access-Control-Allow-Methods": "POST, OPTIONS"
};
const reply = (body: Record<string, unknown>, status = 200) => new Response(JSON.stringify(body), {
  status, headers: { ...cors, "Content-Type": "application/json", "Cache-Control": "no-store" }
});
const text = (v: unknown) => String(v ?? "").trim();
const pdfText = (v: unknown) => String(v ?? "").normalize("NFC").replace(/[^\u0000-\u00FF]/g, " ");
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

function lerCertificado(rawPfx: Uint8Array, passphrase: string) {
  const p12Asn1 = forge.asn1.fromDer(Buffer.from(rawPfx).toString("binary"));
  const p12 = forge.pkcs12.pkcs12FromAsn1(p12Asn1, false, passphrase);
  const certBags: Array<{ cert?: any }> = p12.getBags({ bagType: forge.pki.oids.certBag })[forge.pki.oids.certBag] || [];
  const keyBags = p12.getBags({ bagType: forge.pki.oids.pkcs8ShroudedKeyBag })[forge.pki.oids.pkcs8ShroudedKeyBag] || [];
  const privateKey = keyBags[0]?.key;
  if (!privateKey) throw new Error("O PFX não contém uma chave privada compatível.");
  const certificate = certBags.map(bag => bag.cert).find(cert =>
    cert?.publicKey?.n?.compareTo(privateKey.n) === 0 && cert?.publicKey?.e?.compareTo(privateKey.e) === 0
  );
  if (!certificate) throw new Error("O certificado e a chave privada do PFX não correspondem.");
  const serialFields = certificate.subject.attributes
    .filter(attribute => attribute.name === "serialNumber" || attribute.shortName === "serialNumber" || attribute.type === "2.5.4.5")
    .map(attribute => String(attribute.value));
  let documentId = serialFields.map(value => value.replace(/\D/g, "")).find(value => value.length === 11 || value.length === 14) || "";
  if (!documentId) {
    const subject = certificate.subject.attributes.map(attribute => String(attribute.value)).join(" ");
    const match = subject.match(/(?:CPF|CNPJ)\s*[:=]?\s*([\d./-]{11,18})/i);
    const digits = match?.[1]?.replace(/\D/g, "") || "";
    if (digits.length === 11 || digits.length === 14) documentId = digits;
  }
  if (!documentId) throw new Error("Não foi possível identificar se o certificado é e-CPF ou e-CNPJ.");
  const tipo = documentId.length === 11 ? "ecpf" : "ecnpj";
  const titular = String(certificate.subject.getField("CN")?.value || "Titular do certificado").slice(0, 180);
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
  const write = (value: string, size = 12, face = font) => {
    const words = String(value || "").split(/\s+/);
    let line = "";
    for (const word of words) {
      const candidate = line ? `${line} ${word}` : word;
      if (line && face.widthOfTextAtSize(candidate, size) > 480) {
        if (y < 70) nextPage();
        page.drawText(line, { x: margin, y, size, font: face, color }); y -= size * 1.55;
        line = word;
      } else line = candidate;
    }
    if (line) {
      if (y < 70) nextPage();
      page.drawText(line, { x: margin, y, size, font: face, color }); y -= size * 1.55;
    }
  };
  write(pdfText(document.titulo), 18, bold); y -= 16;
  write(`Para: ${pdfText(document.destinatario)}`, 12, bold);
  write(`Assunto: ${pdfText(document.assunto)}`, 12, bold); y -= 18;
  for (const paragraph of pdfText(document.corpo).split(/\n+/)) { write(paragraph); y -= 8; }
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
        senha: form.get("senha")
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
        metadata = lerCertificado(rawPfx, passphrase);
        if (new Date(metadata.validade_ate).getTime() <= Date.now()) return reply({ error: "O certificado PFX já está vencido." }, 400);
      } catch { return reply({ error: "Não foi possível validar o PFX. Confira a senha e se o certificado contém CPF ou CNPJ identificável." }, 400); }
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
        metadata = lerCertificado(rawPfx, passphrase);
        if (new Date(metadata.validade_ate).getTime() <= Date.now()) return reply({ error: "O certificado PFX já está vencido." }, 400);
      } catch { return reply({ error: "Não foi possível validar o PFX. Confira a senha e se o certificado contém CPF ou CNPJ identificável." }, 400); }

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
      const claims = JSON.parse(atob(token.split(".")[1].replace(/-/g, "+").replace(/_/g, "/")));
      const authTime = Number(claims.auth_time || 0);
      if (!authTime || Math.floor(Date.now() / 1000) - authTime > 300) return reply({ error: "Confirme sua senha do Hub novamente antes de assinar." }, 401);
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

import { defineConfig } from 'vite';
import { resolve } from 'node:path';

export default defineConfig({
  appType: 'mpa',
  build: {
    rollupOptions: {
      input: {
        home: resolve(__dirname, 'index.html'),
        blog: resolve(__dirname, 'blog.html'),
        contato: resolve(__dirname, 'contato.html'),
        hub: resolve(__dirname, 'hub/index.html'),
        certificadosDigitais: resolve(__dirname, 'servicos/certificados-digitais.html'),
        consorcio: resolve(__dirname, 'servicos/consorcio.html'),
        planosEmpresa: resolve(__dirname, 'servicos/planos-empresa.html'),
        planosIndividuais: resolve(__dirname, 'servicos/planos-individuais.html'),
        seguroAuto: resolve(__dirname, 'servicos/seguro-auto.html'),
        seguroCondominio: resolve(__dirname, 'servicos/seguro-condominio.html'),
        seguroRiscoEmpresarial: resolve(__dirname, 'servicos/seguro-de-risco-empresarial.html'),
        seguroVidaColetivo: resolve(__dirname, 'servicos/seguro-de-vida-coletivo.html'),
        seguroVidaIndividual: resolve(__dirname, 'servicos/seguro-de-vida-individual.html'),
        seguroResidencial: resolve(__dirname, 'servicos/seguro-residencial.html'),
        artigoCertificado: resolve(__dirname, 'artigos/certificado-digital-videoconferencia.html'),
        artigoConsorcioAposentadoria: resolve(__dirname, 'artigos/consorcio-aposentadoria.html'),
        artigoConsorcioImoveis: resolve(__dirname, 'artigos/consorcio-imoveis.html'),
        artigoDoencasGraves: resolve(__dirname, 'artigos/doencas-graves.html'),
        artigoPlanejamentoSucessorio: resolve(__dirname, 'artigos/planejamento-sucessorio.html')
      }
    }
  }
});

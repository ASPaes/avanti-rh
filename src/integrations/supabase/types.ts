export type Json =
  | string
  | number
  | boolean
  | null
  | { [key: string]: Json | undefined }
  | Json[]

export type Database = {
  // Allows to automatically instantiate createClient with right options
  // instead of createClient<Database, { PostgrestVersion: 'XX' }>(URL, KEY)
  __InternalSupabase: {
    PostgrestVersion: "14.5"
  }
  public: {
    Tables: {
      ai_caso_uso: {
        Row: {
          ancora_documento: boolean
          ativo: boolean
          codigo: string
          descricao: string | null
          modelo_tier: string | null
          nivel_risco: string
          nome: string
          prompt_template: string
          requer_revisao: boolean
          updated_at: string
          versao: number
        }
        Insert: {
          ancora_documento?: boolean
          ativo?: boolean
          codigo: string
          descricao?: string | null
          modelo_tier?: string | null
          nivel_risco?: string
          nome: string
          prompt_template: string
          requer_revisao?: boolean
          updated_at?: string
          versao?: number
        }
        Update: {
          ancora_documento?: boolean
          ativo?: boolean
          codigo?: string
          descricao?: string | null
          modelo_tier?: string | null
          nivel_risco?: string
          nome?: string
          prompt_template?: string
          requer_revisao?: boolean
          updated_at?: string
          versao?: number
        }
        Relationships: []
      }
      ai_config_global: {
        Row: {
          ativo: boolean
          cota_mensal_padrao: number | null
          id: boolean
          modelo_codigo: string
          provider: Database["public"]["Enums"]["ai_provider"]
          updated_at: string
          vault_secret_id: string
        }
        Insert: {
          ativo?: boolean
          cota_mensal_padrao?: number | null
          id?: boolean
          modelo_codigo: string
          provider: Database["public"]["Enums"]["ai_provider"]
          updated_at?: string
          vault_secret_id: string
        }
        Update: {
          ativo?: boolean
          cota_mensal_padrao?: number | null
          id?: boolean
          modelo_codigo?: string
          provider?: Database["public"]["Enums"]["ai_provider"]
          updated_at?: string
          vault_secret_id?: string
        }
        Relationships: []
      }
      ai_modelo: {
        Row: {
          ativo: boolean
          contexto_max: number | null
          created_at: string
          custo_in_milhao: number | null
          custo_out_milhao: number | null
          economico: boolean
          id: string
          label: string
          modelo_codigo: string
          provider: Database["public"]["Enums"]["ai_provider"]
          updated_at: string
        }
        Insert: {
          ativo?: boolean
          contexto_max?: number | null
          created_at?: string
          custo_in_milhao?: number | null
          custo_out_milhao?: number | null
          economico?: boolean
          id?: string
          label: string
          modelo_codigo: string
          provider: Database["public"]["Enums"]["ai_provider"]
          updated_at?: string
        }
        Update: {
          ativo?: boolean
          contexto_max?: number | null
          created_at?: string
          custo_in_milhao?: number | null
          custo_out_milhao?: number | null
          economico?: boolean
          id?: string
          label?: string
          modelo_codigo?: string
          provider?: Database["public"]["Enums"]["ai_provider"]
          updated_at?: string
        }
        Relationships: []
      }
      ai_uso: {
        Row: {
          caso_uso: string
          created_at: string
          custo_estimado: number | null
          erro: string | null
          id: string
          modelo_codigo: string
          origem_chave: string
          provider: Database["public"]["Enums"]["ai_provider"]
          sucesso: boolean
          tenant_id: string
          tokens_input: number | null
          tokens_output: number | null
        }
        Insert: {
          caso_uso: string
          created_at?: string
          custo_estimado?: number | null
          erro?: string | null
          id?: string
          modelo_codigo: string
          origem_chave: string
          provider: Database["public"]["Enums"]["ai_provider"]
          sucesso: boolean
          tenant_id: string
          tokens_input?: number | null
          tokens_output?: number | null
        }
        Update: {
          caso_uso?: string
          created_at?: string
          custo_estimado?: number | null
          erro?: string | null
          id?: string
          modelo_codigo?: string
          origem_chave?: string
          provider?: Database["public"]["Enums"]["ai_provider"]
          sucesso?: boolean
          tenant_id?: string
          tokens_input?: number | null
          tokens_output?: number | null
        }
        Relationships: [
          {
            foreignKeyName: "ai_uso_caso_uso_fkey"
            columns: ["caso_uso"]
            isOneToOne: false
            referencedRelation: "ai_caso_uso"
            referencedColumns: ["codigo"]
          },
          {
            foreignKeyName: "ai_uso_tenant_id_fkey"
            columns: ["tenant_id"]
            isOneToOne: false
            referencedRelation: "tenants"
            referencedColumns: ["id"]
          },
        ]
      }
      audit_log: {
        Row: {
          acao: string
          created_at: string
          id: number
          ip_address: unknown
          payload: Json
          recurso: string | null
          recurso_id: string | null
          tenant_id: string | null
          user_agent: string | null
          user_id: string | null
        }
        Insert: {
          acao: string
          created_at?: string
          id?: number
          ip_address?: unknown
          payload?: Json
          recurso?: string | null
          recurso_id?: string | null
          tenant_id?: string | null
          user_agent?: string | null
          user_id?: string | null
        }
        Update: {
          acao?: string
          created_at?: string
          id?: number
          ip_address?: unknown
          payload?: Json
          recurso?: string | null
          recurso_id?: string | null
          tenant_id?: string | null
          user_agent?: string | null
          user_id?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "audit_log_tenant_id_fkey"
            columns: ["tenant_id"]
            isOneToOne: false
            referencedRelation: "tenants"
            referencedColumns: ["id"]
          },
        ]
      }
      cbo: {
        Row: {
          ativo: boolean
          codigo: string
          created_at: string
          titulo: string
        }
        Insert: {
          ativo?: boolean
          codigo: string
          created_at?: string
          titulo: string
        }
        Update: {
          ativo?: boolean
          codigo?: string
          created_at?: string
          titulo?: string
        }
        Relationships: []
      }
      cbo_sinonimo: {
        Row: {
          cbo_codigo: string
          created_at: string
          id: string
          termo: string
        }
        Insert: {
          cbo_codigo: string
          created_at?: string
          id?: string
          termo: string
        }
        Update: {
          cbo_codigo?: string
          created_at?: string
          id?: string
          termo?: string
        }
        Relationships: [
          {
            foreignKeyName: "cbo_sinonimo_cbo_codigo_fkey"
            columns: ["cbo_codigo"]
            isOneToOne: false
            referencedRelation: "cbo"
            referencedColumns: ["codigo"]
          },
        ]
      }
      empresa_cargo: {
        Row: {
          atividades: string | null
          carga_horaria: string | null
          cbo_codigo: string | null
          created_at: string
          empresa_cliente_id: string
          id: string
          nome_funcao: string
          ordem: number
          qtd_colaboradores: number
          setor_id: string | null
          tenant_id: string
          updated_at: string
        }
        Insert: {
          atividades?: string | null
          carga_horaria?: string | null
          cbo_codigo?: string | null
          created_at?: string
          empresa_cliente_id: string
          id?: string
          nome_funcao: string
          ordem?: number
          qtd_colaboradores?: number
          setor_id?: string | null
          tenant_id: string
          updated_at?: string
        }
        Update: {
          atividades?: string | null
          carga_horaria?: string | null
          cbo_codigo?: string | null
          created_at?: string
          empresa_cliente_id?: string
          id?: string
          nome_funcao?: string
          ordem?: number
          qtd_colaboradores?: number
          setor_id?: string | null
          tenant_id?: string
          updated_at?: string
        }
        Relationships: [
          {
            foreignKeyName: "empresa_cargo_cbo_codigo_fkey"
            columns: ["cbo_codigo"]
            isOneToOne: false
            referencedRelation: "cbo"
            referencedColumns: ["codigo"]
          },
          {
            foreignKeyName: "empresa_cargo_empresa_cliente_id_fkey"
            columns: ["empresa_cliente_id"]
            isOneToOne: false
            referencedRelation: "empresas_cliente"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "empresa_cargo_setor_id_fkey"
            columns: ["setor_id"]
            isOneToOne: false
            referencedRelation: "setores"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "empresa_cargo_tenant_id_fkey"
            columns: ["tenant_id"]
            isOneToOne: false
            referencedRelation: "tenants"
            referencedColumns: ["id"]
          },
        ]
      }
      empresas_cliente: {
        Row: {
          area_atuacao: string | null
          cnae: string | null
          cnpj: string
          contato_email: string | null
          contato_responsavel: string | null
          contato_telefone: string | null
          created_at: string
          deleted_at: string | null
          endereco_bairro: string | null
          endereco_cep: string | null
          endereco_cidade: string | null
          endereco_complemento: string | null
          endereco_logradouro: string | null
          endereco_numero: string | null
          endereco_uf: string | null
          grau_risco: number | null
          id: string
          inscricao_estadual: string | null
          inscricao_municipal: string | null
          metadata: Json
          nome_fantasia: string | null
          perfil_atividade_id: string | null
          qtd_colaboradores_estimado: number | null
          razao_social: string
          segmento: string | null
          status: string
          tenant_id: string
          updated_at: string
        }
        Insert: {
          area_atuacao?: string | null
          cnae?: string | null
          cnpj: string
          contato_email?: string | null
          contato_responsavel?: string | null
          contato_telefone?: string | null
          created_at?: string
          deleted_at?: string | null
          endereco_bairro?: string | null
          endereco_cep?: string | null
          endereco_cidade?: string | null
          endereco_complemento?: string | null
          endereco_logradouro?: string | null
          endereco_numero?: string | null
          endereco_uf?: string | null
          grau_risco?: number | null
          id?: string
          inscricao_estadual?: string | null
          inscricao_municipal?: string | null
          metadata?: Json
          nome_fantasia?: string | null
          perfil_atividade_id?: string | null
          qtd_colaboradores_estimado?: number | null
          razao_social: string
          segmento?: string | null
          status?: string
          tenant_id: string
          updated_at?: string
        }
        Update: {
          area_atuacao?: string | null
          cnae?: string | null
          cnpj?: string
          contato_email?: string | null
          contato_responsavel?: string | null
          contato_telefone?: string | null
          created_at?: string
          deleted_at?: string | null
          endereco_bairro?: string | null
          endereco_cep?: string | null
          endereco_cidade?: string | null
          endereco_complemento?: string | null
          endereco_logradouro?: string | null
          endereco_numero?: string | null
          endereco_uf?: string | null
          grau_risco?: number | null
          id?: string
          inscricao_estadual?: string | null
          inscricao_municipal?: string | null
          metadata?: Json
          nome_fantasia?: string | null
          perfil_atividade_id?: string | null
          qtd_colaboradores_estimado?: number | null
          razao_social?: string
          segmento?: string | null
          status?: string
          tenant_id?: string
          updated_at?: string
        }
        Relationships: [
          {
            foreignKeyName: "empresas_cliente_perfil_atividade_id_fkey"
            columns: ["perfil_atividade_id"]
            isOneToOne: false
            referencedRelation: "nr1_perfil_atividade"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "empresas_cliente_tenant_id_fkey"
            columns: ["tenant_id"]
            isOneToOne: false
            referencedRelation: "tenants"
            referencedColumns: ["id"]
          },
        ]
      }
      modulos: {
        Row: {
          ativo: boolean
          codigo: Database["public"]["Enums"]["modulo_codigo"]
          created_at: string
          descricao: string | null
          icone: string | null
          nome: string
          ordem_menu: number
        }
        Insert: {
          ativo?: boolean
          codigo: Database["public"]["Enums"]["modulo_codigo"]
          created_at?: string
          descricao?: string | null
          icone?: string | null
          nome: string
          ordem_menu?: number
        }
        Update: {
          ativo?: boolean
          codigo?: Database["public"]["Enums"]["modulo_codigo"]
          created_at?: string
          descricao?: string | null
          icone?: string | null
          nome?: string
          ordem_menu?: number
        }
        Relationships: []
      }
      nr1_analise_setor: {
        Row: {
          avaliacao_id: string
          created_at: string
          created_by: string | null
          gerado_por_ia: boolean
          id: string
          setor_id: string | null
          tenant_id: string
          texto: string | null
          updated_at: string
        }
        Insert: {
          avaliacao_id: string
          created_at?: string
          created_by?: string | null
          gerado_por_ia?: boolean
          id?: string
          setor_id?: string | null
          tenant_id: string
          texto?: string | null
          updated_at?: string
        }
        Update: {
          avaliacao_id?: string
          created_at?: string
          created_by?: string | null
          gerado_por_ia?: boolean
          id?: string
          setor_id?: string | null
          tenant_id?: string
          texto?: string | null
          updated_at?: string
        }
        Relationships: [
          {
            foreignKeyName: "nr1_analise_setor_avaliacao_id_fkey"
            columns: ["avaliacao_id"]
            isOneToOne: false
            referencedRelation: "nr1_avaliacao"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "nr1_analise_setor_setor_id_fkey"
            columns: ["setor_id"]
            isOneToOne: false
            referencedRelation: "setores"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "nr1_analise_setor_tenant_id_fkey"
            columns: ["tenant_id"]
            isOneToOne: false
            referencedRelation: "tenants"
            referencedColumns: ["id"]
          },
        ]
      }
      nr1_avaliacao: {
        Row: {
          created_at: string
          created_by: string | null
          data_fim: string
          data_inicio: string
          data_realizacao: string | null
          empresa_cliente_id: string
          encerrada_em: string | null
          encerrada_por: string | null
          id: string
          instrumento_descricao: string | null
          limite_respostas: number
          link_publico: string | null
          metadata: Json
          modelo_instrumento_id: string
          motivo_encerramento: string | null
          nome: string
          observacao_contextual: string | null
          qtd_colaboradores_epoca: number | null
          respostas_completadas: number
          status: string
          tenant_id: string
          updated_at: string
        }
        Insert: {
          created_at?: string
          created_by?: string | null
          data_fim: string
          data_inicio?: string
          data_realizacao?: string | null
          empresa_cliente_id: string
          encerrada_em?: string | null
          encerrada_por?: string | null
          id?: string
          instrumento_descricao?: string | null
          limite_respostas: number
          link_publico?: string | null
          metadata?: Json
          modelo_instrumento_id: string
          motivo_encerramento?: string | null
          nome: string
          observacao_contextual?: string | null
          qtd_colaboradores_epoca?: number | null
          respostas_completadas?: number
          status?: string
          tenant_id: string
          updated_at?: string
        }
        Update: {
          created_at?: string
          created_by?: string | null
          data_fim?: string
          data_inicio?: string
          data_realizacao?: string | null
          empresa_cliente_id?: string
          encerrada_em?: string | null
          encerrada_por?: string | null
          id?: string
          instrumento_descricao?: string | null
          limite_respostas?: number
          link_publico?: string | null
          metadata?: Json
          modelo_instrumento_id?: string
          motivo_encerramento?: string | null
          nome?: string
          observacao_contextual?: string | null
          qtd_colaboradores_epoca?: number | null
          respostas_completadas?: number
          status?: string
          tenant_id?: string
          updated_at?: string
        }
        Relationships: [
          {
            foreignKeyName: "nr1_avaliacao_empresa_cliente_id_fkey"
            columns: ["empresa_cliente_id"]
            isOneToOne: false
            referencedRelation: "empresas_cliente"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "nr1_avaliacao_modelo_instrumento_id_fkey"
            columns: ["modelo_instrumento_id"]
            isOneToOne: false
            referencedRelation: "nr1_modelo_instrumento"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "nr1_avaliacao_tenant_id_fkey"
            columns: ["tenant_id"]
            isOneToOne: false
            referencedRelation: "tenants"
            referencedColumns: ["id"]
          },
        ]
      }
      nr1_catalogo_subescala: {
        Row: {
          catalogo_status: string
          codigo: string
          created_at: string
          descricao_clinica: string | null
          texto_acoes_pgr: string | null
          texto_agravos: string | null
          texto_significado: string | null
          updated_at: string
          validado_em: string | null
          validado_por: string | null
        }
        Insert: {
          catalogo_status?: string
          codigo: string
          created_at?: string
          descricao_clinica?: string | null
          texto_acoes_pgr?: string | null
          texto_agravos?: string | null
          texto_significado?: string | null
          updated_at?: string
          validado_em?: string | null
          validado_por?: string | null
        }
        Update: {
          catalogo_status?: string
          codigo?: string
          created_at?: string
          descricao_clinica?: string | null
          texto_acoes_pgr?: string | null
          texto_agravos?: string | null
          texto_significado?: string | null
          updated_at?: string
          validado_em?: string | null
          validado_por?: string | null
        }
        Relationships: []
      }
      nr1_indicador_epidemiologico: {
        Row: {
          afastamentos_b31: number | null
          afastamentos_b91: number | null
          avaliacao_id: string
          created_at: string
          created_by: string | null
          fap: number | null
          id: string
          num_acidentes: number | null
          num_empregados_referencia: number | null
          observacoes: string | null
          parecer_indicadores: string | null
          periodo_fim: string | null
          periodo_inicio: string | null
          taxa_absenteismo: number | null
          taxa_turnover: number | null
          tenant_id: string
          updated_at: string
        }
        Insert: {
          afastamentos_b31?: number | null
          afastamentos_b91?: number | null
          avaliacao_id: string
          created_at?: string
          created_by?: string | null
          fap?: number | null
          id?: string
          num_acidentes?: number | null
          num_empregados_referencia?: number | null
          observacoes?: string | null
          parecer_indicadores?: string | null
          periodo_fim?: string | null
          periodo_inicio?: string | null
          taxa_absenteismo?: number | null
          taxa_turnover?: number | null
          tenant_id: string
          updated_at?: string
        }
        Update: {
          afastamentos_b31?: number | null
          afastamentos_b91?: number | null
          avaliacao_id?: string
          created_at?: string
          created_by?: string | null
          fap?: number | null
          id?: string
          num_acidentes?: number | null
          num_empregados_referencia?: number | null
          observacoes?: string | null
          parecer_indicadores?: string | null
          periodo_fim?: string | null
          periodo_inicio?: string | null
          taxa_absenteismo?: number | null
          taxa_turnover?: number | null
          tenant_id?: string
          updated_at?: string
        }
        Relationships: [
          {
            foreignKeyName: "nr1_indicador_epidemiologico_avaliacao_id_fkey"
            columns: ["avaliacao_id"]
            isOneToOne: true
            referencedRelation: "nr1_avaliacao"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "nr1_indicador_epidemiologico_tenant_id_fkey"
            columns: ["tenant_id"]
            isOneToOne: false
            referencedRelation: "tenants"
            referencedColumns: ["id"]
          },
        ]
      }
      nr1_modelo_escala: {
        Row: {
          codigo: string
          created_at: string
          descricao: string | null
          id: string
          modelo_id: string
          nome: string
          ordem: number
        }
        Insert: {
          codigo: string
          created_at?: string
          descricao?: string | null
          id?: string
          modelo_id: string
          nome: string
          ordem?: number
        }
        Update: {
          codigo?: string
          created_at?: string
          descricao?: string | null
          id?: string
          modelo_id?: string
          nome?: string
          ordem?: number
        }
        Relationships: [
          {
            foreignKeyName: "nr1_modelo_escala_modelo_id_fkey"
            columns: ["modelo_id"]
            isOneToOne: false
            referencedRelation: "nr1_modelo_instrumento"
            referencedColumns: ["id"]
          },
        ]
      }
      nr1_modelo_instrumento: {
        Row: {
          ativo: boolean
          autor_referencia: string | null
          codigo: string
          created_at: string
          descricao: string | null
          id: string
          metadata: Json
          nome: string
          norma_referencia: string | null
          origem: string
          parent_modelo_id: string | null
          publicado: boolean
          updated_at: string
          versao: string
        }
        Insert: {
          ativo?: boolean
          autor_referencia?: string | null
          codigo: string
          created_at?: string
          descricao?: string | null
          id?: string
          metadata?: Json
          nome: string
          norma_referencia?: string | null
          origem?: string
          parent_modelo_id?: string | null
          publicado?: boolean
          updated_at?: string
          versao?: string
        }
        Update: {
          ativo?: boolean
          autor_referencia?: string | null
          codigo?: string
          created_at?: string
          descricao?: string | null
          id?: string
          metadata?: Json
          nome?: string
          norma_referencia?: string | null
          origem?: string
          parent_modelo_id?: string | null
          publicado?: boolean
          updated_at?: string
          versao?: string
        }
        Relationships: [
          {
            foreignKeyName: "nr1_modelo_instrumento_parent_modelo_id_fkey"
            columns: ["parent_modelo_id"]
            isOneToOne: false
            referencedRelation: "nr1_modelo_instrumento"
            referencedColumns: ["id"]
          },
        ]
      }
      nr1_modelo_opcao_escala: {
        Row: {
          created_at: string
          escala_id: string
          id: string
          ordem: number
          rotulo: string
          valor: number
        }
        Insert: {
          created_at?: string
          escala_id: string
          id?: string
          ordem: number
          rotulo: string
          valor: number
        }
        Update: {
          created_at?: string
          escala_id?: string
          id?: string
          ordem?: number
          rotulo?: string
          valor?: number
        }
        Relationships: [
          {
            foreignKeyName: "nr1_modelo_opcao_escala_escala_id_fkey"
            columns: ["escala_id"]
            isOneToOne: false
            referencedRelation: "nr1_modelo_escala"
            referencedColumns: ["id"]
          },
        ]
      }
      nr1_modelo_questao: {
        Row: {
          codigo: string
          created_at: string
          escala_id: string | null
          id: string
          modelo_id: string
          numero: number | null
          obrigatoria: boolean
          opcoes: Json | null
          ordem: number
          texto: string
          tipo: string
        }
        Insert: {
          codigo: string
          created_at?: string
          escala_id?: string | null
          id?: string
          modelo_id: string
          numero?: number | null
          obrigatoria?: boolean
          opcoes?: Json | null
          ordem?: number
          texto: string
          tipo: string
        }
        Update: {
          codigo?: string
          created_at?: string
          escala_id?: string | null
          id?: string
          modelo_id?: string
          numero?: number | null
          obrigatoria?: boolean
          opcoes?: Json | null
          ordem?: number
          texto?: string
          tipo?: string
        }
        Relationships: [
          {
            foreignKeyName: "nr1_modelo_questao_escala_id_fkey"
            columns: ["escala_id"]
            isOneToOne: false
            referencedRelation: "nr1_modelo_escala"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "nr1_modelo_questao_modelo_id_fkey"
            columns: ["modelo_id"]
            isOneToOne: false
            referencedRelation: "nr1_modelo_instrumento"
            referencedColumns: ["id"]
          },
        ]
      }
      nr1_modelo_subescala: {
        Row: {
          codigo: string
          created_at: string
          dimensao_macro: string
          id: string
          modelo_id: string
          nome: string
          ordem: number
          severidade: string
          tipo: string
        }
        Insert: {
          codigo: string
          created_at?: string
          dimensao_macro: string
          id?: string
          modelo_id: string
          nome: string
          ordem?: number
          severidade: string
          tipo: string
        }
        Update: {
          codigo?: string
          created_at?: string
          dimensao_macro?: string
          id?: string
          modelo_id?: string
          nome?: string
          ordem?: number
          severidade?: string
          tipo?: string
        }
        Relationships: [
          {
            foreignKeyName: "nr1_modelo_subescala_modelo_id_fkey"
            columns: ["modelo_id"]
            isOneToOne: false
            referencedRelation: "nr1_modelo_instrumento"
            referencedColumns: ["id"]
          },
        ]
      }
      nr1_modelo_subescala_questao: {
        Row: {
          created_at: string
          invertido: boolean
          peso: number
          questao_id: string
          subescala_id: string
        }
        Insert: {
          created_at?: string
          invertido?: boolean
          peso?: number
          questao_id: string
          subescala_id: string
        }
        Update: {
          created_at?: string
          invertido?: boolean
          peso?: number
          questao_id?: string
          subescala_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "nr1_modelo_subescala_questao_questao_id_fkey"
            columns: ["questao_id"]
            isOneToOne: false
            referencedRelation: "nr1_modelo_questao"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "nr1_modelo_subescala_questao_subescala_id_fkey"
            columns: ["subescala_id"]
            isOneToOne: false
            referencedRelation: "nr1_modelo_subescala"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "nr1_modelo_subescala_questao_subescala_id_fkey"
            columns: ["subescala_id"]
            isOneToOne: false
            referencedRelation: "nr1_subescala_catalogo"
            referencedColumns: ["id"]
          },
        ]
      }
      nr1_perfil_atividade: {
        Row: {
          ativo: boolean
          cnae_prefixos: string[] | null
          codigo: string
          created_at: string
          created_by: string | null
          descricao: string | null
          grau_risco_ref: number | null
          id: string
          nome: string
          origem: string
          tenant_id: string | null
        }
        Insert: {
          ativo?: boolean
          cnae_prefixos?: string[] | null
          codigo: string
          created_at?: string
          created_by?: string | null
          descricao?: string | null
          grau_risco_ref?: number | null
          id?: string
          nome: string
          origem?: string
          tenant_id?: string | null
        }
        Update: {
          ativo?: boolean
          cnae_prefixos?: string[] | null
          codigo?: string
          created_at?: string
          created_by?: string | null
          descricao?: string | null
          grau_risco_ref?: number | null
          id?: string
          nome?: string
          origem?: string
          tenant_id?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "nr1_perfil_atividade_tenant_id_fkey"
            columns: ["tenant_id"]
            isOneToOne: false
            referencedRelation: "tenants"
            referencedColumns: ["id"]
          },
        ]
      }
      nr1_plano_acao: {
        Row: {
          avaliacao_id: string
          como: string | null
          created_at: string
          created_by: string | null
          gerado_por_ia: boolean
          id: string
          nivel_risco_origem: string
          o_que: string | null
          onde: string | null
          ordem: number
          por_que: string | null
          prazo: string | null
          quando: string | null
          quanto: string | null
          quem: string | null
          realizado_inicio: string | null
          realizado_termino: string | null
          responsavel: string | null
          setor_id: string | null
          status: string
          subescala_id: string
          tenant_id: string
          updated_at: string
        }
        Insert: {
          avaliacao_id: string
          como?: string | null
          created_at?: string
          created_by?: string | null
          gerado_por_ia?: boolean
          id?: string
          nivel_risco_origem: string
          o_que?: string | null
          onde?: string | null
          ordem?: number
          por_que?: string | null
          prazo?: string | null
          quando?: string | null
          quanto?: string | null
          quem?: string | null
          realizado_inicio?: string | null
          realizado_termino?: string | null
          responsavel?: string | null
          setor_id?: string | null
          status?: string
          subescala_id: string
          tenant_id: string
          updated_at?: string
        }
        Update: {
          avaliacao_id?: string
          como?: string | null
          created_at?: string
          created_by?: string | null
          gerado_por_ia?: boolean
          id?: string
          nivel_risco_origem?: string
          o_que?: string | null
          onde?: string | null
          ordem?: number
          por_que?: string | null
          prazo?: string | null
          quando?: string | null
          quanto?: string | null
          quem?: string | null
          realizado_inicio?: string | null
          realizado_termino?: string | null
          responsavel?: string | null
          setor_id?: string | null
          status?: string
          subescala_id?: string
          tenant_id?: string
          updated_at?: string
        }
        Relationships: [
          {
            foreignKeyName: "nr1_plano_acao_avaliacao_id_fkey"
            columns: ["avaliacao_id"]
            isOneToOne: false
            referencedRelation: "nr1_avaliacao"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "nr1_plano_acao_setor_id_fkey"
            columns: ["setor_id"]
            isOneToOne: false
            referencedRelation: "setores"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "nr1_plano_acao_subescala_id_fkey"
            columns: ["subescala_id"]
            isOneToOne: false
            referencedRelation: "nr1_modelo_subescala"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "nr1_plano_acao_subescala_id_fkey"
            columns: ["subescala_id"]
            isOneToOne: false
            referencedRelation: "nr1_subescala_catalogo"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "nr1_plano_acao_tenant_id_fkey"
            columns: ["tenant_id"]
            isOneToOne: false
            referencedRelation: "tenants"
            referencedColumns: ["id"]
          },
        ]
      }
      nr1_relatorio: {
        Row: {
          assinado_em: string | null
          avaliacao_id: string
          conteudo: Json
          created_at: string
          gerado_em: string
          gerado_por: string | null
          id: string
          observacoes: string | null
          responsavel_tecnico_id: string | null
          status: string
          tenant_id: string
          updated_at: string
          versao: number
        }
        Insert: {
          assinado_em?: string | null
          avaliacao_id: string
          conteudo: Json
          created_at?: string
          gerado_em?: string
          gerado_por?: string | null
          id?: string
          observacoes?: string | null
          responsavel_tecnico_id?: string | null
          status?: string
          tenant_id: string
          updated_at?: string
          versao: number
        }
        Update: {
          assinado_em?: string | null
          avaliacao_id?: string
          conteudo?: Json
          created_at?: string
          gerado_em?: string
          gerado_por?: string | null
          id?: string
          observacoes?: string | null
          responsavel_tecnico_id?: string | null
          status?: string
          tenant_id?: string
          updated_at?: string
          versao?: number
        }
        Relationships: [
          {
            foreignKeyName: "nr1_relatorio_avaliacao_id_fkey"
            columns: ["avaliacao_id"]
            isOneToOne: false
            referencedRelation: "nr1_avaliacao"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "nr1_relatorio_responsavel_tecnico_id_fkey"
            columns: ["responsavel_tecnico_id"]
            isOneToOne: false
            referencedRelation: "responsavel_tecnico"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "nr1_relatorio_tenant_id_fkey"
            columns: ["tenant_id"]
            isOneToOne: false
            referencedRelation: "tenants"
            referencedColumns: ["id"]
          },
        ]
      }
      nr1_relatorio_template: {
        Row: {
          ativo: boolean
          chave: string
          corpo: string
          created_at: string
          created_by: string | null
          id: string
          ordem: number
          tenant_id: string | null
          titulo: string
          updated_at: string
        }
        Insert: {
          ativo?: boolean
          chave: string
          corpo: string
          created_at?: string
          created_by?: string | null
          id?: string
          ordem?: number
          tenant_id?: string | null
          titulo: string
          updated_at?: string
        }
        Update: {
          ativo?: boolean
          chave?: string
          corpo?: string
          created_at?: string
          created_by?: string | null
          id?: string
          ordem?: number
          tenant_id?: string | null
          titulo?: string
          updated_at?: string
        }
        Relationships: [
          {
            foreignKeyName: "nr1_relatorio_template_tenant_id_fkey"
            columns: ["tenant_id"]
            isOneToOne: false
            referencedRelation: "tenants"
            referencedColumns: ["id"]
          },
        ]
      }
      nr1_respondente_anonimo: {
        Row: {
          avaliacao_id: string
          created_at: string
          dispositivo: string
          faixa_etaria: string
          faixa_etaria_outro: string | null
          id: string
          sessao_id: string
          setor_id: string
          sexo: string
          submetido_em: string
          tempo_resposta_segundos: number | null
          treinamento_rp: string
        }
        Insert: {
          avaliacao_id: string
          created_at?: string
          dispositivo?: string
          faixa_etaria: string
          faixa_etaria_outro?: string | null
          id?: string
          sessao_id: string
          setor_id: string
          sexo: string
          submetido_em?: string
          tempo_resposta_segundos?: number | null
          treinamento_rp: string
        }
        Update: {
          avaliacao_id?: string
          created_at?: string
          dispositivo?: string
          faixa_etaria?: string
          faixa_etaria_outro?: string | null
          id?: string
          sessao_id?: string
          setor_id?: string
          sexo?: string
          submetido_em?: string
          tempo_resposta_segundos?: number | null
          treinamento_rp?: string
        }
        Relationships: [
          {
            foreignKeyName: "nr1_respondente_anonimo_avaliacao_id_fkey"
            columns: ["avaliacao_id"]
            isOneToOne: false
            referencedRelation: "nr1_avaliacao"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "nr1_respondente_anonimo_sessao_id_fkey"
            columns: ["sessao_id"]
            isOneToOne: true
            referencedRelation: "nr1_sessao_resposta"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "nr1_respondente_anonimo_setor_id_fkey"
            columns: ["setor_id"]
            isOneToOne: false
            referencedRelation: "setores"
            referencedColumns: ["id"]
          },
        ]
      }
      nr1_resposta: {
        Row: {
          created_at: string
          id: string
          questao_id: string
          respondente_id: string
          valor: number
        }
        Insert: {
          created_at?: string
          id?: string
          questao_id: string
          respondente_id: string
          valor: number
        }
        Update: {
          created_at?: string
          id?: string
          questao_id?: string
          respondente_id?: string
          valor?: number
        }
        Relationships: [
          {
            foreignKeyName: "nr1_resposta_questao_id_fkey"
            columns: ["questao_id"]
            isOneToOne: false
            referencedRelation: "nr1_modelo_questao"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "nr1_resposta_respondente_id_fkey"
            columns: ["respondente_id"]
            isOneToOne: false
            referencedRelation: "nr1_respondente_anonimo"
            referencedColumns: ["id"]
          },
        ]
      }
      nr1_sessao_resposta: {
        Row: {
          avaliacao_id: string
          completada_em: string | null
          created_at: string
          dispositivo: string
          id: string
          iniciada_em: string
          ip_hash: string | null
          respondente_id: string | null
          status: string
          token_sessao: string
          ultima_atividade_em: string
          user_agent_hash: string | null
        }
        Insert: {
          avaliacao_id: string
          completada_em?: string | null
          created_at?: string
          dispositivo?: string
          id?: string
          iniciada_em?: string
          ip_hash?: string | null
          respondente_id?: string | null
          status?: string
          token_sessao: string
          ultima_atividade_em?: string
          user_agent_hash?: string | null
        }
        Update: {
          avaliacao_id?: string
          completada_em?: string | null
          created_at?: string
          dispositivo?: string
          id?: string
          iniciada_em?: string
          ip_hash?: string | null
          respondente_id?: string | null
          status?: string
          token_sessao?: string
          ultima_atividade_em?: string
          user_agent_hash?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "fk_sessao_respondente"
            columns: ["respondente_id"]
            isOneToOne: false
            referencedRelation: "nr1_respondente_anonimo"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "nr1_sessao_resposta_avaliacao_id_fkey"
            columns: ["avaliacao_id"]
            isOneToOne: false
            referencedRelation: "nr1_avaliacao"
            referencedColumns: ["id"]
          },
        ]
      }
      nr1_severidade_override: {
        Row: {
          classificacao_minima: string | null
          created_at: string
          created_by: string | null
          empresa_cliente_id: string | null
          escopo: string
          id: string
          justificativa: string | null
          perfil_id: string | null
          permitir_rebaixar: boolean
          responsavel_tecnico_id: string | null
          severidade: string
          subescala_codigo: string
          tenant_id: string
        }
        Insert: {
          classificacao_minima?: string | null
          created_at?: string
          created_by?: string | null
          empresa_cliente_id?: string | null
          escopo: string
          id?: string
          justificativa?: string | null
          perfil_id?: string | null
          permitir_rebaixar?: boolean
          responsavel_tecnico_id?: string | null
          severidade: string
          subescala_codigo: string
          tenant_id: string
        }
        Update: {
          classificacao_minima?: string | null
          created_at?: string
          created_by?: string | null
          empresa_cliente_id?: string | null
          escopo?: string
          id?: string
          justificativa?: string | null
          perfil_id?: string | null
          permitir_rebaixar?: boolean
          responsavel_tecnico_id?: string | null
          severidade?: string
          subescala_codigo?: string
          tenant_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "nr1_severidade_override_empresa_cliente_id_fkey"
            columns: ["empresa_cliente_id"]
            isOneToOne: false
            referencedRelation: "empresas_cliente"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "nr1_severidade_override_perfil_id_fkey"
            columns: ["perfil_id"]
            isOneToOne: false
            referencedRelation: "nr1_perfil_atividade"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "nr1_severidade_override_responsavel_tecnico_id_fkey"
            columns: ["responsavel_tecnico_id"]
            isOneToOne: false
            referencedRelation: "responsavel_tecnico"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "nr1_severidade_override_tenant_id_fkey"
            columns: ["tenant_id"]
            isOneToOne: false
            referencedRelation: "tenants"
            referencedColumns: ["id"]
          },
        ]
      }
      ntep_cnae: {
        Row: {
          ativo: boolean
          capitulo_cid: string | null
          cid_agrupamento: string
          cnae: string
          created_at: string
          descricao: string | null
          fonte: string
          id: string
        }
        Insert: {
          ativo?: boolean
          capitulo_cid?: string | null
          cid_agrupamento: string
          cnae: string
          created_at?: string
          descricao?: string | null
          fonte?: string
          id?: string
        }
        Update: {
          ativo?: boolean
          capitulo_cid?: string | null
          cid_agrupamento?: string
          cnae?: string
          created_at?: string
          descricao?: string | null
          fonte?: string
          id?: string
        }
        Relationships: []
      }
      profiles: {
        Row: {
          created_at: string
          deleted_at: string | null
          email: string
          id: string
          metadata: Json
          nome_completo: string
          registro_profissional: string | null
          telefone: string | null
          tenant_id: string | null
          updated_at: string
        }
        Insert: {
          created_at?: string
          deleted_at?: string | null
          email: string
          id: string
          metadata?: Json
          nome_completo: string
          registro_profissional?: string | null
          telefone?: string | null
          tenant_id?: string | null
          updated_at?: string
        }
        Update: {
          created_at?: string
          deleted_at?: string | null
          email?: string
          id?: string
          metadata?: Json
          nome_completo?: string
          registro_profissional?: string | null
          telefone?: string | null
          tenant_id?: string | null
          updated_at?: string
        }
        Relationships: [
          {
            foreignKeyName: "profiles_tenant_id_fkey"
            columns: ["tenant_id"]
            isOneToOne: false
            referencedRelation: "tenants"
            referencedColumns: ["id"]
          },
        ]
      }
      responsavel_tecnico: {
        Row: {
          ativo: boolean
          created_at: string
          created_by: string | null
          id: string
          nome: string
          numero_registro: string
          ordem: number
          papel: string | null
          tenant_id: string
          tipo_conselho: string
          uf_conselho: string | null
          updated_at: string
        }
        Insert: {
          ativo?: boolean
          created_at?: string
          created_by?: string | null
          id?: string
          nome: string
          numero_registro: string
          ordem?: number
          papel?: string | null
          tenant_id: string
          tipo_conselho: string
          uf_conselho?: string | null
          updated_at?: string
        }
        Update: {
          ativo?: boolean
          created_at?: string
          created_by?: string | null
          id?: string
          nome?: string
          numero_registro?: string
          ordem?: number
          papel?: string | null
          tenant_id?: string
          tipo_conselho?: string
          uf_conselho?: string | null
          updated_at?: string
        }
        Relationships: [
          {
            foreignKeyName: "responsavel_tecnico_tenant_id_fkey"
            columns: ["tenant_id"]
            isOneToOne: false
            referencedRelation: "tenants"
            referencedColumns: ["id"]
          },
        ]
      }
      setores: {
        Row: {
          ativo: boolean
          created_at: string
          descricao: string | null
          empresa_cliente_id: string
          id: string
          metadata: Json
          nome: string
          ordem: number
          qtd_colaboradores_estimado: number | null
          tenant_id: string
          updated_at: string
        }
        Insert: {
          ativo?: boolean
          created_at?: string
          descricao?: string | null
          empresa_cliente_id: string
          id?: string
          metadata?: Json
          nome: string
          ordem?: number
          qtd_colaboradores_estimado?: number | null
          tenant_id: string
          updated_at?: string
        }
        Update: {
          ativo?: boolean
          created_at?: string
          descricao?: string | null
          empresa_cliente_id?: string
          id?: string
          metadata?: Json
          nome?: string
          ordem?: number
          qtd_colaboradores_estimado?: number | null
          tenant_id?: string
          updated_at?: string
        }
        Relationships: [
          {
            foreignKeyName: "setores_empresa_cliente_id_fkey"
            columns: ["empresa_cliente_id"]
            isOneToOne: false
            referencedRelation: "empresas_cliente"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "setores_tenant_id_fkey"
            columns: ["tenant_id"]
            isOneToOne: false
            referencedRelation: "tenants"
            referencedColumns: ["id"]
          },
        ]
      }
      tenant_ai_config: {
        Row: {
          ativo: boolean
          created_at: string
          id: string
          modelo_codigo: string
          provider: Database["public"]["Enums"]["ai_provider"]
          tenant_id: string
          ultimos4: string | null
          updated_at: string
          validada_em: string | null
          vault_secret_id: string
        }
        Insert: {
          ativo?: boolean
          created_at?: string
          id?: string
          modelo_codigo: string
          provider: Database["public"]["Enums"]["ai_provider"]
          tenant_id: string
          ultimos4?: string | null
          updated_at?: string
          validada_em?: string | null
          vault_secret_id: string
        }
        Update: {
          ativo?: boolean
          created_at?: string
          id?: string
          modelo_codigo?: string
          provider?: Database["public"]["Enums"]["ai_provider"]
          tenant_id?: string
          ultimos4?: string | null
          updated_at?: string
          validada_em?: string | null
          vault_secret_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "tenant_ai_config_tenant_id_fkey"
            columns: ["tenant_id"]
            isOneToOne: false
            referencedRelation: "tenants"
            referencedColumns: ["id"]
          },
        ]
      }
      tenant_modulos: {
        Row: {
          ativo: boolean
          created_at: string
          data_fim: string | null
          data_inicio: string
          id: string
          metadata: Json
          modulo_codigo: Database["public"]["Enums"]["modulo_codigo"]
          tenant_id: string
          updated_at: string
        }
        Insert: {
          ativo?: boolean
          created_at?: string
          data_fim?: string | null
          data_inicio?: string
          id?: string
          metadata?: Json
          modulo_codigo: Database["public"]["Enums"]["modulo_codigo"]
          tenant_id: string
          updated_at?: string
        }
        Update: {
          ativo?: boolean
          created_at?: string
          data_fim?: string | null
          data_inicio?: string
          id?: string
          metadata?: Json
          modulo_codigo?: Database["public"]["Enums"]["modulo_codigo"]
          tenant_id?: string
          updated_at?: string
        }
        Relationships: [
          {
            foreignKeyName: "tenant_modulos_modulo_codigo_fkey"
            columns: ["modulo_codigo"]
            isOneToOne: false
            referencedRelation: "modulos"
            referencedColumns: ["codigo"]
          },
          {
            foreignKeyName: "tenant_modulos_tenant_id_fkey"
            columns: ["tenant_id"]
            isOneToOne: false
            referencedRelation: "tenants"
            referencedColumns: ["id"]
          },
        ]
      }
      tenants: {
        Row: {
          cnpj: string | null
          created_at: string
          deleted_at: string | null
          id: string
          is_superadmin: boolean
          logo_url: string | null
          metadata: Json
          nome_fantasia: string
          razao_social: string | null
          slug: string
          status: Database["public"]["Enums"]["tenant_status"]
          updated_at: string
        }
        Insert: {
          cnpj?: string | null
          created_at?: string
          deleted_at?: string | null
          id?: string
          is_superadmin?: boolean
          logo_url?: string | null
          metadata?: Json
          nome_fantasia: string
          razao_social?: string | null
          slug: string
          status?: Database["public"]["Enums"]["tenant_status"]
          updated_at?: string
        }
        Update: {
          cnpj?: string | null
          created_at?: string
          deleted_at?: string | null
          id?: string
          is_superadmin?: boolean
          logo_url?: string | null
          metadata?: Json
          nome_fantasia?: string
          razao_social?: string | null
          slug?: string
          status?: Database["public"]["Enums"]["tenant_status"]
          updated_at?: string
        }
        Relationships: []
      }
      user_roles: {
        Row: {
          created_at: string
          granted_by: string | null
          id: string
          role: Database["public"]["Enums"]["app_role"]
          tenant_id: string | null
          user_id: string
        }
        Insert: {
          created_at?: string
          granted_by?: string | null
          id?: string
          role: Database["public"]["Enums"]["app_role"]
          tenant_id?: string | null
          user_id: string
        }
        Update: {
          created_at?: string
          granted_by?: string | null
          id?: string
          role?: Database["public"]["Enums"]["app_role"]
          tenant_id?: string | null
          user_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "user_roles_tenant_id_fkey"
            columns: ["tenant_id"]
            isOneToOne: false
            referencedRelation: "tenants"
            referencedColumns: ["id"]
          },
        ]
      }
    }
    Views: {
      ai_uso_mensal: {
        Row: {
          chamadas: number | null
          chamadas_erro: number | null
          chamadas_ok: number | null
          custo_avanti_usd: number | null
          custo_medio_chamada_usd: number | null
          custo_total_usd: number | null
          mes: string | null
          tenant_id: string | null
          tokens_in: number | null
          tokens_out: number | null
        }
        Relationships: [
          {
            foreignKeyName: "ai_uso_tenant_id_fkey"
            columns: ["tenant_id"]
            isOneToOne: false
            referencedRelation: "tenants"
            referencedColumns: ["id"]
          },
        ]
      }
      nr1_catalogo_editor: {
        Row: {
          catalogo_status: string | null
          codigo: string | null
          descricao_clinica: string | null
          dimensao_macro: string | null
          nome: string | null
          ordem: number | null
          severidade: string | null
          texto_acoes_pgr: string | null
          texto_agravos: string | null
          texto_significado: string | null
          tipo: string | null
        }
        Relationships: []
      }
      nr1_subescala_catalogo: {
        Row: {
          catalogo_status: string | null
          codigo: string | null
          descricao_clinica: string | null
          dimensao_macro: string | null
          id: string | null
          modelo_id: string | null
          nome: string | null
          ordem: number | null
          severidade: string | null
          texto_acoes_pgr: string | null
          texto_agravos: string | null
          texto_significado: string | null
          tipo: string | null
        }
        Relationships: [
          {
            foreignKeyName: "nr1_modelo_subescala_modelo_id_fkey"
            columns: ["modelo_id"]
            isOneToOne: false
            referencedRelation: "nr1_modelo_instrumento"
            referencedColumns: ["id"]
          },
        ]
      }
    }
    Functions: {
      fn_buscar_cbo: {
        Args: { p_limite?: number; p_termo: string }
        Returns: {
          codigo: string
          score: number
          titulo: string
        }[]
      }
      fn_gerar_token_curto: { Args: { p_tamanho?: number }; Returns: string }
      ia_vault_read_secret: { Args: { p_id: string }; Returns: string }
      ia_vault_upsert_secret: {
        Args: { p_name: string; p_secret: string }
        Returns: string
      }
      nr1_adesao_avaliacao: { Args: { p_avaliacao_id: string }; Returns: Json }
      nr1_gerar_relatorio: { Args: { p_avaliacao_id: string }; Returns: Json }
      nr1_importar_respostas: {
        Args: { p_avaliacao_id: string; p_respondentes: Json }
        Returns: Json
      }
      nr1_iniciar_sessao: {
        Args: {
          p_dispositivo?: string
          p_ip?: string
          p_link_publico: string
          p_user_agent?: string
        }
        Returns: Json
      }
      nr1_resultado_avaliacao: {
        Args: { p_avaliacao_id: string; p_setor_id?: string }
        Returns: Json
      }
      nr1_submeter_resposta: {
        Args: {
          p_respostas: Json
          p_setor_id: string
          p_sociodemo: Json
          p_tempo_resposta_segundos?: number
          p_token_sessao: string
        }
        Returns: Json
      }
      show_limit: { Args: never; Returns: number }
      show_trgm: { Args: { "": string }; Returns: string[] }
      unaccent: { Args: { "": string }; Returns: string }
    }
    Enums: {
      ai_provider: "openai" | "anthropic" | "gemini"
      app_role:
        | "super_admin"
        | "owner"
        | "tenant_admin"
        | "tenant_manager"
        | "rt_psicologo"
        | "operador"
        | "respondente"
      modulo_codigo: "nr1" | "rec" | "fin" | "pgr"
      tenant_status: "trial" | "active" | "suspended" | "canceled"
    }
    CompositeTypes: {
      [_ in never]: never
    }
  }
}

type DatabaseWithoutInternals = Omit<Database, "__InternalSupabase">

type DefaultSchema = DatabaseWithoutInternals[Extract<keyof Database, "public">]

export type Tables<
  DefaultSchemaTableNameOrOptions extends
    | keyof (DefaultSchema["Tables"] & DefaultSchema["Views"])
    | { schema: keyof DatabaseWithoutInternals },
  TableName extends DefaultSchemaTableNameOrOptions extends {
    schema: keyof DatabaseWithoutInternals
  }
    ? keyof (DatabaseWithoutInternals[DefaultSchemaTableNameOrOptions["schema"]]["Tables"] &
        DatabaseWithoutInternals[DefaultSchemaTableNameOrOptions["schema"]]["Views"])
    : never = never,
> = DefaultSchemaTableNameOrOptions extends {
  schema: keyof DatabaseWithoutInternals
}
  ? (DatabaseWithoutInternals[DefaultSchemaTableNameOrOptions["schema"]]["Tables"] &
      DatabaseWithoutInternals[DefaultSchemaTableNameOrOptions["schema"]]["Views"])[TableName] extends {
      Row: infer R
    }
    ? R
    : never
  : DefaultSchemaTableNameOrOptions extends keyof (DefaultSchema["Tables"] &
        DefaultSchema["Views"])
    ? (DefaultSchema["Tables"] &
        DefaultSchema["Views"])[DefaultSchemaTableNameOrOptions] extends {
        Row: infer R
      }
      ? R
      : never
    : never

export type TablesInsert<
  DefaultSchemaTableNameOrOptions extends
    | keyof DefaultSchema["Tables"]
    | { schema: keyof DatabaseWithoutInternals },
  TableName extends DefaultSchemaTableNameOrOptions extends {
    schema: keyof DatabaseWithoutInternals
  }
    ? keyof DatabaseWithoutInternals[DefaultSchemaTableNameOrOptions["schema"]]["Tables"]
    : never = never,
> = DefaultSchemaTableNameOrOptions extends {
  schema: keyof DatabaseWithoutInternals
}
  ? DatabaseWithoutInternals[DefaultSchemaTableNameOrOptions["schema"]]["Tables"][TableName] extends {
      Insert: infer I
    }
    ? I
    : never
  : DefaultSchemaTableNameOrOptions extends keyof DefaultSchema["Tables"]
    ? DefaultSchema["Tables"][DefaultSchemaTableNameOrOptions] extends {
        Insert: infer I
      }
      ? I
      : never
    : never

export type TablesUpdate<
  DefaultSchemaTableNameOrOptions extends
    | keyof DefaultSchema["Tables"]
    | { schema: keyof DatabaseWithoutInternals },
  TableName extends DefaultSchemaTableNameOrOptions extends {
    schema: keyof DatabaseWithoutInternals
  }
    ? keyof DatabaseWithoutInternals[DefaultSchemaTableNameOrOptions["schema"]]["Tables"]
    : never = never,
> = DefaultSchemaTableNameOrOptions extends {
  schema: keyof DatabaseWithoutInternals
}
  ? DatabaseWithoutInternals[DefaultSchemaTableNameOrOptions["schema"]]["Tables"][TableName] extends {
      Update: infer U
    }
    ? U
    : never
  : DefaultSchemaTableNameOrOptions extends keyof DefaultSchema["Tables"]
    ? DefaultSchema["Tables"][DefaultSchemaTableNameOrOptions] extends {
        Update: infer U
      }
      ? U
      : never
    : never

export type Enums<
  DefaultSchemaEnumNameOrOptions extends
    | keyof DefaultSchema["Enums"]
    | { schema: keyof DatabaseWithoutInternals },
  EnumName extends DefaultSchemaEnumNameOrOptions extends {
    schema: keyof DatabaseWithoutInternals
  }
    ? keyof DatabaseWithoutInternals[DefaultSchemaEnumNameOrOptions["schema"]]["Enums"]
    : never = never,
> = DefaultSchemaEnumNameOrOptions extends {
  schema: keyof DatabaseWithoutInternals
}
  ? DatabaseWithoutInternals[DefaultSchemaEnumNameOrOptions["schema"]]["Enums"][EnumName]
  : DefaultSchemaEnumNameOrOptions extends keyof DefaultSchema["Enums"]
    ? DefaultSchema["Enums"][DefaultSchemaEnumNameOrOptions]
    : never

export type CompositeTypes<
  PublicCompositeTypeNameOrOptions extends
    | keyof DefaultSchema["CompositeTypes"]
    | { schema: keyof DatabaseWithoutInternals },
  CompositeTypeName extends PublicCompositeTypeNameOrOptions extends {
    schema: keyof DatabaseWithoutInternals
  }
    ? keyof DatabaseWithoutInternals[PublicCompositeTypeNameOrOptions["schema"]]["CompositeTypes"]
    : never = never,
> = PublicCompositeTypeNameOrOptions extends {
  schema: keyof DatabaseWithoutInternals
}
  ? DatabaseWithoutInternals[PublicCompositeTypeNameOrOptions["schema"]]["CompositeTypes"][CompositeTypeName]
  : PublicCompositeTypeNameOrOptions extends keyof DefaultSchema["CompositeTypes"]
    ? DefaultSchema["CompositeTypes"][PublicCompositeTypeNameOrOptions]
    : never

export const Constants = {
  public: {
    Enums: {
      ai_provider: ["openai", "anthropic", "gemini"],
      app_role: [
        "super_admin",
        "owner",
        "tenant_admin",
        "tenant_manager",
        "rt_psicologo",
        "operador",
        "respondente",
      ],
      modulo_codigo: ["nr1", "rec", "fin", "pgr"],
      tenant_status: ["trial", "active", "suspended", "canceled"],
    },
  },
} as const

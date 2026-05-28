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
          qtd_colaboradores_estimado?: number | null
          razao_social?: string
          segmento?: string | null
          status?: string
          tenant_id?: string
          updated_at?: string
        }
        Relationships: [
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
          descricao_clinica: string | null
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
          descricao_clinica?: string | null
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
          descricao_clinica?: string | null
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
          peso: number
          questao_id: string
          subescala_id: string
        }
        Insert: {
          created_at?: string
          peso?: number
          questao_id: string
          subescala_id: string
        }
        Update: {
          created_at?: string
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
      [_ in never]: never
    }
    Functions: {
      fn_gerar_token_curto: { Args: { p_tamanho?: number }; Returns: string }
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
    }
    Enums: {
      app_role:
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
      app_role: [
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

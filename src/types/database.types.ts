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
  graphql_public: {
    Tables: {
      [_ in never]: never
    }
    Views: {
      [_ in never]: never
    }
    Functions: {
      graphql: {
        Args: {
          extensions?: Json
          operationName?: string
          query?: string
          variables?: Json
        }
        Returns: Json
      }
    }
    Enums: {
      [_ in never]: never
    }
    CompositeTypes: {
      [_ in never]: never
    }
  }
  public: {
    Tables: {
      campanas: {
        Row: {
          created_at: string
          estado: Database["public"]["Enums"]["campana_estado"]
          fecha: string
          id: string
          nombre: string
          tipo_encuesta_id: string
        }
        Insert: {
          created_at?: string
          estado?: Database["public"]["Enums"]["campana_estado"]
          fecha?: string
          id?: string
          nombre: string
          tipo_encuesta_id: string
        }
        Update: {
          created_at?: string
          estado?: Database["public"]["Enums"]["campana_estado"]
          fecha?: string
          id?: string
          nombre?: string
          tipo_encuesta_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "campanas_tipo_encuesta_id_fkey"
            columns: ["tipo_encuesta_id"]
            isOneToOne: false
            referencedRelation: "tipos_encuesta"
            referencedColumns: ["id"]
          },
        ]
      }
      clientes: {
        Row: {
          concesionario: string
          created_at: string
          id: string
          nombre: string
          orden_fabricacion: string | null
          tecnologia: string | null
          telefono: string
          telefono_2: string | null
          telefono_3: string | null
          tipo_maquina: string | null
        }
        Insert: {
          concesionario: string
          created_at?: string
          id?: string
          nombre: string
          orden_fabricacion?: string | null
          tecnologia?: string | null
          telefono: string
          telefono_2?: string | null
          telefono_3?: string | null
          tipo_maquina?: string | null
        }
        Update: {
          concesionario?: string
          created_at?: string
          id?: string
          nombre?: string
          orden_fabricacion?: string | null
          tecnologia?: string | null
          telefono?: string
          telefono_2?: string | null
          telefono_3?: string | null
          tipo_maquina?: string | null
        }
        Relationships: []
      }
      email_errores: {
        Row: {
          asunto: string
          created_at: string
          destinatarios: string[]
          error_mensaje: string
          id: string
        }
        Insert: {
          asunto: string
          created_at?: string
          destinatarios?: string[]
          error_mensaje: string
          id?: string
        }
        Update: {
          asunto?: string
          created_at?: string
          destinatarios?: string[]
          error_mensaje?: string
          id?: string
        }
        Relationships: []
      }
      encuesta_medidas: {
        Row: {
          comentario: string
          created_at: string
          created_by: string | null
          encuesta_id: string
          id: string
          updated_at: string
        }
        Insert: {
          comentario: string
          created_at?: string
          created_by?: string | null
          encuesta_id: string
          id?: string
          updated_at?: string
        }
        Update: {
          comentario?: string
          created_at?: string
          created_by?: string | null
          encuesta_id?: string
          id?: string
          updated_at?: string
        }
        Relationships: [
          {
            foreignKeyName: "encuesta_medidas_encuesta_id_fkey"
            columns: ["encuesta_id"]
            isOneToOne: false
            referencedRelation: "encuestas"
            referencedColumns: ["id"]
          },
        ]
      }
      encuestas: {
        Row: {
          campana_id: string
          cliente_id: string
          comentario_sin_respuesta: string | null
          created_at: string
          estado: Database["public"]["Enums"]["encuesta_estado"]
          id: string
          marcado_sin_respuesta_at: string | null
          marcado_sin_respuesta_por: string | null
          token: string
        }
        Insert: {
          campana_id: string
          cliente_id: string
          comentario_sin_respuesta?: string | null
          created_at?: string
          estado?: Database["public"]["Enums"]["encuesta_estado"]
          id?: string
          marcado_sin_respuesta_at?: string | null
          marcado_sin_respuesta_por?: string | null
          token?: string
        }
        Update: {
          campana_id?: string
          cliente_id?: string
          comentario_sin_respuesta?: string | null
          created_at?: string
          estado?: Database["public"]["Enums"]["encuesta_estado"]
          id?: string
          marcado_sin_respuesta_at?: string | null
          marcado_sin_respuesta_por?: string | null
          token?: string
        }
        Relationships: [
          {
            foreignKeyName: "encuestas_campana_id_fkey"
            columns: ["campana_id"]
            isOneToOne: false
            referencedRelation: "campanas"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "encuestas_campana_id_fkey"
            columns: ["campana_id"]
            isOneToOne: false
            referencedRelation: "v_encuestas_completas"
            referencedColumns: ["campana_id"]
          },
          {
            foreignKeyName: "encuestas_campana_id_fkey"
            columns: ["campana_id"]
            isOneToOne: false
            referencedRelation: "v_nps_por_campana"
            referencedColumns: ["campana_id"]
          },
          {
            foreignKeyName: "encuestas_cliente_id_fkey"
            columns: ["cliente_id"]
            isOneToOne: false
            referencedRelation: "clientes"
            referencedColumns: ["id"]
          },
        ]
      }
      envios: {
        Row: {
          campana_id: string
          cliente_id: string
          created_at: string
          estado_envio: Database["public"]["Enums"]["envio_estado"]
          fecha_envio: string | null
          id: string
          notificacion_enviada: boolean
          numero_recordatorio: number
        }
        Insert: {
          campana_id: string
          cliente_id: string
          created_at?: string
          estado_envio?: Database["public"]["Enums"]["envio_estado"]
          fecha_envio?: string | null
          id?: string
          notificacion_enviada?: boolean
          numero_recordatorio?: number
        }
        Update: {
          campana_id?: string
          cliente_id?: string
          created_at?: string
          estado_envio?: Database["public"]["Enums"]["envio_estado"]
          fecha_envio?: string | null
          id?: string
          notificacion_enviada?: boolean
          numero_recordatorio?: number
        }
        Relationships: [
          {
            foreignKeyName: "envios_campana_id_fkey"
            columns: ["campana_id"]
            isOneToOne: false
            referencedRelation: "campanas"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "envios_campana_id_fkey"
            columns: ["campana_id"]
            isOneToOne: false
            referencedRelation: "v_encuestas_completas"
            referencedColumns: ["campana_id"]
          },
          {
            foreignKeyName: "envios_campana_id_fkey"
            columns: ["campana_id"]
            isOneToOne: false
            referencedRelation: "v_nps_por_campana"
            referencedColumns: ["campana_id"]
          },
          {
            foreignKeyName: "envios_cliente_id_fkey"
            columns: ["cliente_id"]
            isOneToOne: false
            referencedRelation: "clientes"
            referencedColumns: ["id"]
          },
        ]
      }
      envios_whatsapp_detalle: {
        Row: {
          celular: string
          encuesta_id: string
          enviado_at: string | null
          error_mensaje: string | null
          estado: string
          id: string
          job_id: string
          nombre: string
          url_encuesta: string
        }
        Insert: {
          celular: string
          encuesta_id: string
          enviado_at?: string | null
          error_mensaje?: string | null
          estado?: string
          id?: string
          job_id: string
          nombre: string
          url_encuesta: string
        }
        Update: {
          celular?: string
          encuesta_id?: string
          enviado_at?: string | null
          error_mensaje?: string | null
          estado?: string
          id?: string
          job_id?: string
          nombre?: string
          url_encuesta?: string
        }
        Relationships: [
          {
            foreignKeyName: "envios_whatsapp_detalle_encuesta_id_fkey"
            columns: ["encuesta_id"]
            isOneToOne: false
            referencedRelation: "encuestas"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "envios_whatsapp_detalle_encuesta_id_fkey"
            columns: ["encuesta_id"]
            isOneToOne: false
            referencedRelation: "v_encuestas_completas"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "envios_whatsapp_detalle_job_id_fkey"
            columns: ["job_id"]
            isOneToOne: false
            referencedRelation: "envios_whatsapp_jobs"
            referencedColumns: ["id"]
          },
        ]
      }
      envios_whatsapp_jobs: {
        Row: {
          campana_id: string
          completed_at: string | null
          created_at: string
          enviados: number
          errores: number
          estado: string
          id: string
          plantilla_id: string
          started_at: string | null
          total_contactos: number
        }
        Insert: {
          campana_id: string
          completed_at?: string | null
          created_at?: string
          enviados?: number
          errores?: number
          estado?: string
          id?: string
          plantilla_id: string
          started_at?: string | null
          total_contactos?: number
        }
        Update: {
          campana_id?: string
          completed_at?: string | null
          created_at?: string
          enviados?: number
          errores?: number
          estado?: string
          id?: string
          plantilla_id?: string
          started_at?: string | null
          total_contactos?: number
        }
        Relationships: [
          {
            foreignKeyName: "envios_whatsapp_jobs_campana_id_fkey"
            columns: ["campana_id"]
            isOneToOne: false
            referencedRelation: "campanas"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "envios_whatsapp_jobs_campana_id_fkey"
            columns: ["campana_id"]
            isOneToOne: false
            referencedRelation: "v_encuestas_completas"
            referencedColumns: ["campana_id"]
          },
          {
            foreignKeyName: "envios_whatsapp_jobs_campana_id_fkey"
            columns: ["campana_id"]
            isOneToOne: false
            referencedRelation: "v_nps_por_campana"
            referencedColumns: ["campana_id"]
          },
          {
            foreignKeyName: "envios_whatsapp_jobs_plantilla_id_fkey"
            columns: ["plantilla_id"]
            isOneToOne: false
            referencedRelation: "plantillas_whatsapp"
            referencedColumns: ["id"]
          },
        ]
      }
      notificaciones: {
        Row: {
          created_at: string
          id: string
          leida: boolean
          mensaje: string
          metadata: Json | null
          para_rol: string
          tipo: Database["public"]["Enums"]["notificacion_tipo"]
          titulo: string
        }
        Insert: {
          created_at?: string
          id?: string
          leida?: boolean
          mensaje: string
          metadata?: Json | null
          para_rol: string
          tipo: Database["public"]["Enums"]["notificacion_tipo"]
          titulo: string
        }
        Update: {
          created_at?: string
          id?: string
          leida?: boolean
          mensaje?: string
          metadata?: Json | null
          para_rol?: string
          tipo?: Database["public"]["Enums"]["notificacion_tipo"]
          titulo?: string
        }
        Relationships: []
      }
      plantillas_whatsapp: {
        Row: {
          activa: boolean
          created_at: string
          id: string
          lineas: string[]
          nombre: string
          ruta_imagen: string | null
          tipo: string
          updated_at: string
        }
        Insert: {
          activa?: boolean
          created_at?: string
          id?: string
          lineas?: string[]
          nombre: string
          ruta_imagen?: string | null
          tipo: string
          updated_at?: string
        }
        Update: {
          activa?: boolean
          created_at?: string
          id?: string
          lineas?: string[]
          nombre?: string
          ruta_imagen?: string | null
          tipo?: string
          updated_at?: string
        }
        Relationships: []
      }
      respuestas: {
        Row: {
          calificacion_capacitacion: number | null
          calificacion_entrega_presentacion: number | null
          calificacion_funcionamiento_anual: number | null
          calificacion_funcionamiento_general: number | null
          calificacion_puesta_marcha: number | null
          calificacion_resolucion_problemas: number | null
          calificacion_tecnico: number | null
          calle_numero: string | null
          canal_respuesta: string
          codigo_postal: string | null
          comentario_concesionario: string | null
          comentario_empresa: string | null
          comentario_general: string | null
          comentario_problemas: string | null
          comentario_producto: string | null
          concesionario_sede: string | null
          email: string | null
          encuesta_id: string
          fecha_envio: string | null
          fecha_respuesta: string
          fecha_seguimiento: string | null
          id: string
          localidad: string | null
          maquina_modelo: string | null
          nombre_apellido: string | null
          nombre_firma_factura: string | null
          nps_concesionario: number
          nps_empresa: number
          nps_producto: number
          numero_seguimiento: string | null
          piso_departamento: string | null
          provincia: string | null
          regalo_estado: Database["public"]["Enums"]["regalo_estado"]
          respuestas_raw: Json | null
          telefono: string | null
          tipo_maquina: Database["public"]["Enums"]["tipo_maquina_enum"]
          tuvo_problemas_tecnicos: boolean | null
        }
        Insert: {
          calificacion_capacitacion?: number | null
          calificacion_entrega_presentacion?: number | null
          calificacion_funcionamiento_anual?: number | null
          calificacion_funcionamiento_general?: number | null
          calificacion_puesta_marcha?: number | null
          calificacion_resolucion_problemas?: number | null
          calificacion_tecnico?: number | null
          calle_numero?: string | null
          canal_respuesta?: string
          codigo_postal?: string | null
          comentario_concesionario?: string | null
          comentario_empresa?: string | null
          comentario_general?: string | null
          comentario_problemas?: string | null
          comentario_producto?: string | null
          concesionario_sede?: string | null
          email?: string | null
          encuesta_id: string
          fecha_envio?: string | null
          fecha_respuesta?: string
          fecha_seguimiento?: string | null
          id?: string
          localidad?: string | null
          maquina_modelo?: string | null
          nombre_apellido?: string | null
          nombre_firma_factura?: string | null
          nps_concesionario: number
          nps_empresa: number
          nps_producto: number
          numero_seguimiento?: string | null
          piso_departamento?: string | null
          provincia?: string | null
          regalo_estado?: Database["public"]["Enums"]["regalo_estado"]
          respuestas_raw?: Json | null
          telefono?: string | null
          tipo_maquina?: Database["public"]["Enums"]["tipo_maquina_enum"]
          tuvo_problemas_tecnicos?: boolean | null
        }
        Update: {
          calificacion_capacitacion?: number | null
          calificacion_entrega_presentacion?: number | null
          calificacion_funcionamiento_anual?: number | null
          calificacion_funcionamiento_general?: number | null
          calificacion_puesta_marcha?: number | null
          calificacion_resolucion_problemas?: number | null
          calificacion_tecnico?: number | null
          calle_numero?: string | null
          canal_respuesta?: string
          codigo_postal?: string | null
          comentario_concesionario?: string | null
          comentario_empresa?: string | null
          comentario_general?: string | null
          comentario_problemas?: string | null
          comentario_producto?: string | null
          concesionario_sede?: string | null
          email?: string | null
          encuesta_id?: string
          fecha_envio?: string | null
          fecha_respuesta?: string
          fecha_seguimiento?: string | null
          id?: string
          localidad?: string | null
          maquina_modelo?: string | null
          nombre_apellido?: string | null
          nombre_firma_factura?: string | null
          nps_concesionario?: number
          nps_empresa?: number
          nps_producto?: number
          numero_seguimiento?: string | null
          piso_departamento?: string | null
          provincia?: string | null
          regalo_estado?: Database["public"]["Enums"]["regalo_estado"]
          respuestas_raw?: Json | null
          telefono?: string | null
          tipo_maquina?: Database["public"]["Enums"]["tipo_maquina_enum"]
          tuvo_problemas_tecnicos?: boolean | null
        }
        Relationships: [
          {
            foreignKeyName: "respuestas_encuesta_id_fkey"
            columns: ["encuesta_id"]
            isOneToOne: true
            referencedRelation: "encuestas"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "respuestas_encuesta_id_fkey"
            columns: ["encuesta_id"]
            isOneToOne: true
            referencedRelation: "v_encuestas_completas"
            referencedColumns: ["id"]
          },
        ]
      }
      system_config: {
        Row: {
          dias_hasta_llamado: number
          dias_notificacion_inicial: number
          dias_notificacion_recordatorio: number
          emails_notificacion: string[]
          emails_rambla: string[]
          id: string
          updated_at: string
        }
        Insert: {
          dias_hasta_llamado?: number
          dias_notificacion_inicial?: number
          dias_notificacion_recordatorio?: number
          emails_notificacion?: string[]
          emails_rambla?: string[]
          id?: string
          updated_at?: string
        }
        Update: {
          dias_hasta_llamado?: number
          dias_notificacion_inicial?: number
          dias_notificacion_recordatorio?: number
          emails_notificacion?: string[]
          emails_rambla?: string[]
          id?: string
          updated_at?: string
        }
        Relationships: []
      }
      tipos_encuesta: {
        Row: {
          activo: boolean
          config: Json | null
          created_at: string
          envia_regalo: boolean
          id: string
          introduccion: string | null
          nombre: string
          preguntas: Json | null
          slug: string
        }
        Insert: {
          activo?: boolean
          config?: Json | null
          created_at?: string
          envia_regalo?: boolean
          id?: string
          introduccion?: string | null
          nombre: string
          preguntas?: Json | null
          slug: string
        }
        Update: {
          activo?: boolean
          config?: Json | null
          created_at?: string
          envia_regalo?: boolean
          id?: string
          introduccion?: string | null
          nombre?: string
          preguntas?: Json | null
          slug?: string
        }
        Relationships: []
      }
    }
    Views: {
      v_encuestas_completas: {
        Row: {
          campana_id: string | null
          campana_nombre: string | null
          cliente_nombre: string | null
          cliente_telefono: string | null
          concesionario: string | null
          created_at: string | null
          estado: Database["public"]["Enums"]["encuesta_estado"] | null
          fecha_respuesta: string | null
          id: string | null
          nps_concesionario: number | null
          nps_empresa: number | null
          nps_producto: number | null
          token: string | null
        }
        Relationships: []
      }
      v_nps_por_campana: {
        Row: {
          avg_nps_concesionario: number | null
          avg_nps_empresa: number | null
          avg_nps_producto: number | null
          campana_id: string | null
          campana_nombre: string | null
          nps_empresa_score: number | null
          total_respuestas: number | null
        }
        Relationships: []
      }
      v_respuestas_rambla: {
        Row: {
          calificacion_capacitacion: number | null
          calificacion_entrega_presentacion: number | null
          calificacion_funcionamiento_anual: number | null
          calificacion_funcionamiento_general: number | null
          calificacion_puesta_marcha: number | null
          calificacion_resolucion_problemas: number | null
          calificacion_tecnico: number | null
          calle_numero: string | null
          canal_respuesta: string | null
          codigo_postal: string | null
          comentario_concesionario: string | null
          comentario_empresa: string | null
          comentario_general: string | null
          comentario_problemas: string | null
          comentario_producto: string | null
          concesionario_sede: string | null
          email: string | null
          encuesta_id: string | null
          fecha_envio: string | null
          fecha_respuesta: string | null
          fecha_seguimiento: string | null
          id: string | null
          localidad: string | null
          maquina_modelo: string | null
          nombre_apellido: string | null
          nombre_firma_factura: string | null
          nps_concesionario: number | null
          nps_empresa: number | null
          nps_producto: number | null
          numero_seguimiento: string | null
          piso_departamento: string | null
          provincia: string | null
          regalo_estado: Database["public"]["Enums"]["regalo_estado"] | null
          respuestas_raw: Json | null
          telefono: string | null
          tipo_maquina: Database["public"]["Enums"]["tipo_maquina_enum"] | null
          tuvo_problemas_tecnicos: boolean | null
        }
        Relationships: []
      }
    }
    Functions: {
      check_campanas_sin_actividad: { Args: never; Returns: undefined }
      sync_encuestas_necesidad_llamado: { Args: never; Returns: number }
    }
    Enums: {
      campana_estado: "activa" | "completada" | "archivada"
      encuesta_estado:
        | "pendiente"
        | "respondida"
        | "recordatorio_enviado"
        | "necesidad_de_llamado"
        | "sin_respuesta"
      envio_estado: "pendiente_envio" | "enviado"
      notificacion_tipo:
        | "nps_critico"
        | "nueva_respuesta"
        | "regalo_pendiente"
        | "campana_sin_actividad"
      regalo_estado: "pendiente_envio" | "enviado"
      tipo_maquina_enum: "sembradora" | "fertilizadora"
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
  graphql_public: {
    Enums: {},
  },
  public: {
    Enums: {
      campana_estado: ["activa", "completada", "archivada"],
      encuesta_estado: [
        "pendiente",
        "respondida",
        "recordatorio_enviado",
        "necesidad_de_llamado",
        "sin_respuesta",
      ],
      envio_estado: ["pendiente_envio", "enviado"],
      notificacion_tipo: [
        "nps_critico",
        "nueva_respuesta",
        "regalo_pendiente",
        "campana_sin_actividad",
      ],
      regalo_estado: ["pendiente_envio", "enviado"],
      tipo_maquina_enum: ["sembradora", "fertilizadora"],
    },
  },
} as const

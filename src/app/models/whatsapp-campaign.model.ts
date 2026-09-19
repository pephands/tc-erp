export interface WhatsappCampaign {
  id: number;
  branch: number;
  branch_name?: string;
  whatsapp_account: number | null;
  campaign_name: string;
  description?: string;
  is_active: boolean;
  created_at?: string;
  updated_at?: string;
}

export interface WhatsappTemplate {
  id: number;
  campaign: number;
  campaign_name?: string;
  template_name: string;
  meta_template_name: string;
  template_type: string;
  is_dynamic: boolean;
  body_variables_config: string[] | null;
  button_variables_config: string[] | null;
  image_upload?: string;
  video_upload?: string;
  document_upload?: string;
  image_url?: string;
  video_url?: string;
  document_url?: string;
  document_filename?: string;
  is_active: boolean;
  created_at?: string;
  updated_at?: string;
}

export interface WhatsappAccount {
  id: number;
  branch: number;
  branch_name?: string;
  platform_name: string;
  whatsapp_number: string;
  api_key: string;
  is_active: boolean;
}


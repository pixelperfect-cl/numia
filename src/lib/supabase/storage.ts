import { supabase } from '../supabase';

export const uploadFile = async (bucket: string, path: string, file: File): Promise<string> => {
    // 1. Upload
    const { data, error } = await supabase.storage.from(bucket).upload(path, file, {
        upsert: true
    });

    if (error) {
        console.error('Supabase Storage Upload Error:', error);
        throw error;
    }

    // 2. Get Public URL
    const { data: { publicUrl } } = supabase.storage.from(bucket).getPublicUrl(path); // Use path correctly, data.path usually works too but path is safer if custom
    return publicUrl;
};

export const uploadProjectAsset = async (file: File, projectId: string): Promise<string> => {
    const extension = file.name.split('.').pop() || 'png';
    const timestamp = Date.now();
    const path = `projects/${projectId}/${timestamp}.${extension}`;

    // We assume a 'files' bucket exists. If not, this will fail and user will need to create it.
    return uploadFile('files', path, file);
};

export const uploadEntityLogo = async (file: File, tempId: string): Promise<string> => {
    const extension = file.name.split('.').pop() || 'png';
    const path = `entities/${tempId}/logo.${extension}`;
    return uploadFile('files', path, file);
};

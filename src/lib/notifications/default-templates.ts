// Plantillas por defecto en español de Chile.
// El usuario las carga con un click desde el panel de notificaciones y luego edita a gusto.
// Variables soportadas vienen del render de las edge functions send-billing-email / run-billing-for-user.

export interface DefaultServiceDue {
    daysBefore: number;
    subject: string;
    body: string;
}

export interface DefaultBilling {
    subject: string;
    body: string;
}

export interface DefaultProjectStatus {
    subject: string;
    body: string;
}

export const defaultServiceDueTemplates: DefaultServiceDue[] = [
    {
        daysBefore: 5,
        subject: 'Recordatorio: tu servicio {{service_name}} vence pronto',
        body:
            'Hola {{client_name}},\n\n' +
            'Te escribo para recordarte que tu servicio "{{service_name}}" vence el {{due_date}} ({{days}} días).\n\n' +
            'Monto: ${{amount}}\n\n' +
            'Si tienes dudas o quieres adelantar el pago, no dudes en escribirme.\n\n' +
            'Saludos,\n' +
            '{{entity_name}}',
    },
    {
        daysBefore: 1,
        subject: 'Aviso: {{service_name}} vence mañana',
        body:
            'Hola {{client_name}},\n\n' +
            'Mañana ({{due_date}}) vence tu servicio "{{service_name}}".\n\n' +
            'Monto: ${{amount}}\n\n' +
            'Cualquier consulta a la mano.\n\n' +
            'Saludos,\n' +
            '{{entity_name}}',
    },
];

export const defaultBillingTemplates: DefaultBilling[] = [
    {
        subject: 'Cobro generado: {{service_name}}',
        body:
            'Hola {{client_name}},\n\n' +
            'Se generó el cobro correspondiente a {{service_name}}.\n\n' +
            'Monto: ${{amount}}\n' +
            'Fecha de cobro: {{due_date}}\n\n' +
            'Cualquier consulta, no dudes en escribirme.\n\n' +
            'Saludos,\n' +
            '{{entity_name}}',
    },
];

export const defaultProjectBillingTemplates: DefaultBilling[] = [
    {
        subject: 'Cobro proyecto: {{project_name}}{{installment_label}}',
        body:
            'Hola {{client_name}},\n\n' +
            'Se generó el cobro correspondiente al proyecto "{{project_name}}".\n\n' +
            'Detalle: {{installment_label}}\n' +
            'Monto: ${{amount}}\n' +
            'Fecha de cobro: {{due_date}}\n\n' +
            'Cualquier consulta, no dudes en escribirme.\n\n' +
            'Saludos,\n' +
            '{{entity_name}}',
    },
];

export const defaultProjectStatusTemplate: DefaultProjectStatus = {
    subject: 'Actualización del proyecto {{project_name}}',
    body:
        'Hola {{client_name}},\n\n' +
        'Te escribo para informarte que el proyecto "{{project_name}}" pasó a la etapa "{{status_name}}".\n\n' +
        'Cualquier consulta sobre los próximos pasos, no dudes en escribirme.\n\n' +
        'Saludos,\n' +
        '{{entity_name}}',
};

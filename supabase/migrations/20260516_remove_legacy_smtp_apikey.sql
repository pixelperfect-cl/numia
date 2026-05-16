-- Strip any legacy ElasticEmail apiKey persisted under entities.settings.smtpConfig.apiKey
-- (moved to server-side secrets).

update public.entities
set settings = jsonb_set(
        settings,
        '{smtpConfig}',
        (settings->'smtpConfig') - 'apiKey',
        false
    )
where settings ? 'smtpConfig'
  and (settings->'smtpConfig') ? 'apiKey';

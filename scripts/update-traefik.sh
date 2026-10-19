#!/bin/bash
docker service update \
  --label-add 'traefik.http.routers.openseo-static.rule=Host(`seo.chathook.com.br`) && (Path(`/site.webmanifest`) || Path(`/favicon.ico`) || PathPrefix(`/favicon`) || PathPrefix(`/apple-touch-icon`) || PathPrefix(`/assets/`) || PathPrefix(`/mcp`) || PathPrefix(`/api/auth/`))' \
  --label-add 'traefik.http.routers.openseo-static.priority=100' \
  --label-add 'traefik.http.routers.openseo-static.service=openseo' \
  --label-add 'traefik.http.routers.openseo-static.entrypoints=websecure' \
  --label-add 'traefik.http.routers.openseo-static.tls.certresolver=letsencryptresolver' \
  openseo_openseo

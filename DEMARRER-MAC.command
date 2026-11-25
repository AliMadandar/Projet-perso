#!/bin/sh
cd "$(dirname "$0")" || exit 1
echo "Ouvrez http://localhost:3000 dans le navigateur."
exec node --env-file-if-exists=.env src/server.js

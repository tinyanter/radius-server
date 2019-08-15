#!/usr/bin/env bash
cnpm install
gulp build
pm2 delete radius-dev
pm2 start pm2-development.json
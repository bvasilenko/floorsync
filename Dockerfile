FROM nginx:1-alpine

RUN echo "server {listen 80; root /html/; \
          location / {try_files \$uri /index.html;}}" > /etc/nginx/conf.d/default.conf

COPY ./dist /html

CMD ["nginx", "-g", "daemon off;"]
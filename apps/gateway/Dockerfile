FROM nginx:stable-alpine
COPY apps/gateway/nginx.conf /etc/nginx/conf.d/default.conf
EXPOSE 80
CMD ["nginx", "-g", "daemon off;"]

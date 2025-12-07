FROM node:18-alpine AS build
WORKDIR /app

# 使用清华源
RUN npm config set registry https://mirrors.tuna.tsinghua.edu.cn/npm/

COPY package*.json ./
RUN npm ci
COPY . .
RUN npm run build

FROM nginx:alpine
COPY --from=build /app/dist /usr/share/nginx/html
COPY nginx.conf /etc/nginx/conf.d/default.conf
EXPOSE 80

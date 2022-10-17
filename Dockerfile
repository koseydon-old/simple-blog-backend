FROM node:10

WORKDIR /app 

RUN npm install 

COPY . . 

EXPOSE 3000 

RUN npm install -g nodemon 

CMD [ "nodemon", "index.js" ]
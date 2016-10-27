FROM newcrossfoodcoop/nxfc_base:v4.5.2

MAINTAINER Ben Simpson, ben@newcrossfoodcoop.org.uk

WORKDIR /home/app

ADD package.json /home/app/package.json
RUN npm install

# Make everything available for start
ADD . /home/app

# Run build
RUN gulp build

# 3030 3031 for api dev/test 
# 5858 for debug
EXPOSE 3030 3031 5858

CMD ["gulp"]

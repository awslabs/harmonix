# This dockerfile builds an image for the python application
# It should be executed with the root of the repo as docker context.
#

FROM --platform=linux/amd64 python:3.9

WORKDIR /app

COPY requirements.txt requirements.txt

RUN pip3 install -r requirements.txt

COPY server.py .
COPY templates ./templates
ENV FLASK_APP server

CMD [ "python3", "-m" , "flask", "run", "--host=0.0.0.0"]

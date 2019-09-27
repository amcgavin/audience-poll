FROM python:3.7
RUN apt update \
    && groupadd -r app \
    && useradd -r --uid 1000 --create-home -g app app

ENV PYTHONUNBUFFERED 1
RUN pip install -U pip && pip install poetry
RUN mkdir /app

WORKDIR /app
COPY poetry.lock pyproject.toml /app/
RUN  poetry config settings.virtualenvs.create false && poetry install

USER app

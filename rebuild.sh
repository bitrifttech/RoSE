#!/bin/bash
docker kill $(docker ps -q)
docker-compose build
docker-compose up -d

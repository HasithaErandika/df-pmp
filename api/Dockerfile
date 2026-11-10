FROM golang:1.23-alpine AS build
WORKDIR /src
COPY go.mod ./
COPY cmd ./cmd
RUN CGO_ENABLED=0 go build -trimpath -ldflags="-s -w" -o /out/df-pmp-api ./cmd/api

FROM alpine:3.21
RUN addgroup -S app && adduser -S app -G app
WORKDIR /app
COPY --from=build /out/df-pmp-api /usr/local/bin/df-pmp-api
COPY config ./config
COPY data ./data
ENV DATA_DIR=/app/data CONFIG_DIR=/app/config
USER app
EXPOSE 8080
ENTRYPOINT ["/usr/local/bin/df-pmp-api"]

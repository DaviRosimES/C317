import os

# Segredo exclusivo dos testes; o valor real vem do .env ou do ambiente.
os.environ.setdefault("AUTH_SECRET_KEY", "segredo-somente-para-testes-nao-usar-em-producao")

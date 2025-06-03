# Techbookfest PDF Exporter

技術書典マイページから購入済みPDFを一括ダウンロードするためのツールです。

## Pre-requisites

- docker / docker-compose
- Node.js, npm

スクレイピングに用いているplaywrightの導入のためdockerを使用します。すでにローカル環境にplaywrightがある場合、環境変数`FORCE_DOWNLOAD_BOOKS=0`の指定で切り替え可能です。

## How to use

1. `docker-compose up -d` でブラウザ起動
2. `npm install`
3. `.env` に環境変数を記述
4. `npx tsx src/main.ts` で実行

PDFファイルはデフォルトで `./downloads/` に保存されます。

これを使うような人はソースコードを読む能力があると思うので、細かい解説は省きます。詳しくは`main.ts`を読んでください。
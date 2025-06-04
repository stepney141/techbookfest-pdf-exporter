# Techbookfest PDF Exporter

技術書典マイページから購入済みPDFを一括ダウンロードするためのツールです。

## Pre-requisites

- docker / docker-compose
- Node.js, npm

スクレイピングに用いているplaywrightの導入のためdockerを使用します。すでにローカル環境にplaywrightがある場合、環境変数`USE_DOCKER_BROWSER=0`の指定により切り替え可能です。

## How to use

1. `docker-compose up -d` でブラウザ起動
2. `npm install`
3. `.env` に環境変数を記述
4. `npx tsx src/main.ts` で実行

書籍データはデフォルトで `./downloads/` に保存されます。ファイル名は`{技術書典マーケットの書籍URLに含まれる固有ID}_{original_filename}.{extension}`の形式です。また、デフォルトでは `./downloads/book_list.csv` に購入済み書籍の一覧がCSVファイルとして保存されます。

これを使うような人はソースコードを読む能力があると思うので、細かい解説は省きます。詳しくは`main.ts`を読んでください。
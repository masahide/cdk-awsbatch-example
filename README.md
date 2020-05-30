# CDK によるaws batchの最小構成の構築

## AWS CDKパッケージのインストール
```bash
# cdk install
npm i -g aws-cdk
# npmで必要なパッケージをインストール
npm install
```

## deploy方法
```bash
# 設定テンプレートから設定ファイル作成
cp cdk.json.template cdk.json
```

cdk.json 中身を適切に修正
```json
{
  "app": "npx ts-node bin/awsbatch.ts",
  "context": {
    "@aws-cdk/core:enableStackNameDuplicates": "true",
    "aws-cdk:enableDiffNoFail": "true",

    "env": "dev",
    "dev": {   <- 開発環境構成
      "stackName": "dev-awsbatch",  <- cloudformation スタック名
      "region": "ap-northeast-1",   <- リージョン名
      "account": "000000000000",    <- アカウントID
      "keyPair": "keyPair_name"     <- EC2 key pair名
    },
    "prd": { <- 本番環境構成
      "stackName": "prd-awsbatch",
      "region": "ap-northeast-1",
      "account": "000000000000",
      "keyPair": "keyPair_name"
    }
  }
}
```

## cdkビルド -> デプロイ
```bash
# cdkをbuild
npm run build

# cdkをデプロイ(dev環境)
cdk deploy --profile <profile name> -c env=dev
```

## 破棄

必要なくなった場合は全てを破棄
```bash
# 一連のリソースを破棄(dev環境)
cdk destroy --profile <profile name> -c env=dev
```

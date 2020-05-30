#!/usr/bin/env node
import * as cdk from '@aws-cdk/core';
import { AwsbatchStack } from '../lib/awsbatch-stack';

const app = new cdk.App();

const settings = app.node.tryGetContext(app.node.tryGetContext('env'))

new AwsbatchStack(app, 'AwsbatchStack',{
    env: {
        account: settings.account,
        region: settings.region
    },
    stackName: settings.stackName
});

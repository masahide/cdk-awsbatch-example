import { expect as expectCDK, haveResource } from '@aws-cdk/assert';
import * as cdk from '@aws-cdk/core';
import * as Awsbatch from '../lib/awsbatch-stack';

test('Batch ComputeEnv Created', () => {
    const app = new cdk.App();
    // WHEN
    const stack = new Awsbatch.AwsbatchStack(app, 'MyTestStack');
    // THEN
    expectCDK(stack).to(haveResource("AWS::Batch::ComputeEnvironment",{
      ComputeEnvironmentName: 'ComputeEnvironment'
    }));
});

test('AWS::EC2::LaunchTemplate Topic Created', () => {
  const app = new cdk.App();
  // WHEN
  const stack = new Awsbatch.AwsbatchStack(app, 'MyTestStack');
  // THEN
  expectCDK(stack).to(haveResource("AWS::EC2::LaunchTemplate"));
});

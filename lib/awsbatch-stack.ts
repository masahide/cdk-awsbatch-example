import * as ec2 from '@aws-cdk/aws-ec2';
import * as batch from '@aws-cdk/aws-batch';
import * as cdk from '@aws-cdk/core';
import * as iam from '@aws-cdk/aws-iam'
import * as ecs from '@aws-cdk/aws-ecs'
import * as s3 from '@aws-cdk/aws-s3'

export class AwsbatchStack extends cdk.Stack {
    constructor(scope: cdk.App, id: string, props?: cdk.StackProps) {
        super(scope, id, props);

        const env = this.node.tryGetContext('env');
        const settings = this.node.tryGetContext(env);

        // vpc
        const vpc = new ec2.Vpc(this, 'TheVPC', {
            cidr: "10.0.0.0/24",
            natGateways: 0,
            maxAzs:3,
            subnetConfiguration: [
                {
                    cidrMask: 28,
                    name: 'public',
                    subnetType: ec2.SubnetType.PUBLIC,
                },
            ]
        })

        // SecurityGroup
        const securityGroup = new ec2.SecurityGroup(this, 'sg', {
            vpc,
            allowAllOutbound: true,
        });

        securityGroup.addEgressRule(ec2.Peer.anyIpv4(), ec2.Port.allTraffic());
        securityGroup.addIngressRule(ec2.Peer.anyIpv4(), ec2.Port.tcp(8080));
        securityGroup.addIngressRule(ec2.Peer.anyIpv4(), ec2.Port.tcp(8081));
        securityGroup.addIngressRule(ec2.Peer.anyIpv4(), ec2.Port.tcp(22));
        securityGroup.addIngressRule(ec2.Peer.anyIpv4(), ec2.Port.tcpRange(26900,26902));
        securityGroup.addIngressRule(ec2.Peer.anyIpv4(), ec2.Port.udpRange(26900,26902));

        // LaunchTemplate
        const LaunchTemplate = new ec2.CfnLaunchTemplate(this, 'LaunchTemplate', {
            launchTemplateName: 'ec2-launchTemplate',
            launchTemplateData: {
                blockDeviceMappings: [
                    {
                        deviceName: '/dev/xvdcz',
                        ebs: {
                            encrypted: true,
                            volumeSize: 25,
                            volumeType: 'gp2'
                        }
                    }
                ]
            }
        });

        // s3
        const s3bucket = new s3.Bucket(this,"s3bucket");

        // spot fleet role
        const SpotFleetRole = new iam.Role(this, 'spotfleetRole', {
            roleName: "SpotFleetRole",
            assumedBy: new iam.ServicePrincipal('spotfleet.amazonaws.com'),
        });
        SpotFleetRole.addManagedPolicy(
            iam.ManagedPolicy.fromManagedPolicyArn(this, 'AmazonEC2SpotFleetTaggingRole',
                                                   'arn:aws:iam::aws:policy/service-role/AmazonEC2SpotFleetTaggingRole'
                                                  ));
        // job role
        const jobRole = new iam.Role(this, 'jobRole', {
            roleName: "JobRole",
            assumedBy: new iam.ServicePrincipal('ecs-tasks.amazonaws.com'),
        });
        jobRole.addManagedPolicy(
            iam.ManagedPolicy.fromManagedPolicyArn(this, 'AmazonS3FullAccess',
                                                      'arn:aws:iam::aws:policy/AmazonS3FullAccess'
                                                     ));
        /*
        const ecsInstanceRole = new iam.Role(this, 'ecsInstanceRole', {
            roleName: "ecsInstanceRole",
            assumedBy: new iam.ServicePrincipal('ec2.amazonaws.com'),
        });
        ecsInstanceRole.addManagedPolicy(
            iam.ManagedPolicy.fromManagedPolicyArn(this, 'AmazonEC2ContainerServiceforEC2Role',
                                                      'arn:aws:iam::aws:policy/service-role/AmazonEC2ContainerServiceforEC2Role'
                                                     ));

        const awsBatchServiceRole = new iam.Role(this, 'batchServiceRole',{
         roleName: "AWSBatchServiceRole",
         assumedBy: new iam.ServicePrincipal('batch.amazonaws.com'),
        });
        awsBatchServiceRole.addManagedPolicy(
            iam.ManagedPolicy.fromManagedPolicyArn(this,
                                                      'AWSBatchServiceRole',
                                                      'arn:aws:iam::aws:policy/service-role/AWSBatchServiceRole'
                                                     ));
       */

        // service link role
        new iam.CfnServiceLinkedRole(this, "AWSServiceRoleForEC2Spot",{ awsServiceName: "spot.amazonaws.com"})
        new iam.CfnServiceLinkedRole(this, "AWSServiceRoleForEC2SpotFleet",{ awsServiceName: "spotfleet.amazonaws.com"})

        const ComputeEnv = new batch.ComputeEnvironment(this, 'ComputeEnv', {
            managed: true,
            // serviceRole: awsBatchServiceRole,
            computeResources: {
                bidPercentage: 70,
                ec2KeyPair: settings.keyPair,
                // image: ecs.EcsOptimizedImage.amazonLinux2(),
                // instanceRole: ,
                instanceTypes: [
                    ec2.InstanceType.of(ec2.InstanceClass.M5, ec2.InstanceSize.LARGE), 
                    ec2.InstanceType.of(ec2.InstanceClass.M4, ec2.InstanceSize.LARGE), 
                ],
                launchTemplate: {
                    launchTemplateName: LaunchTemplate.launchTemplateName as string,
                },
                vpc,
                // desiredvCpus: 1,
                securityGroups: [ securityGroup ],
                spotFleetRole: SpotFleetRole,
                type: batch.ComputeResourceType.SPOT,
                vpcSubnets: vpc.selectSubnets(),
            },
        });
        new batch.JobQueue(this, "JobQueue", {
            computeEnvironments: [ { computeEnvironment:ComputeEnv, order:0 } ],
        });

        new batch.JobDefinition(this,"JobDefinition",{
            container: { 
                image: ecs.ContainerImage.fromRegistry("hello-world") ,
                jobRole: jobRole,
                // command: [ "aws","s3", "ls" ],
                environment: { "BUCKET": s3bucket.bucketName, },
            },
        })

    }
}

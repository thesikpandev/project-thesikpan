terraform {
  required_version = ">= 1.0"
  
  required_providers {
    aws = {
      source  = "hashicorp/aws"
      version = "~> 5.0"
    }
  }
  
  backend "s3" {
    bucket = "thesikpan-terraform-state"
    key    = "prod/terraform.tfstate"
    region = "ap-northeast-2"
  }
}

provider "aws" {
  region = var.aws_region
}

# VPC and Networking
module "vpc" {
  source = "./modules/vpc"
  
  environment = var.environment
  vpc_cidr    = var.vpc_cidr
}

# RDS PostgreSQL
module "rds" {
  source = "./modules/rds"
  
  environment         = var.environment
  vpc_id             = module.vpc.vpc_id
  database_subnets   = module.vpc.database_subnets
  db_instance_class  = "db.t3.micro"  # Start small, scale later
}

# ECS Cluster
module "ecs" {
  source = "./modules/ecs"
  
  environment        = var.environment
  vpc_id            = module.vpc.vpc_id
  public_subnets    = module.vpc.public_subnets
  private_subnets   = module.vpc.private_subnets
  
  # Single task for MVP
  task_cpu          = "512"
  task_memory       = "1024"
  desired_count     = 1
  
  # Database connection
  database_url      = module.rds.connection_string
  
  # Redis (local for MVP, ElastiCache later)
  redis_url         = "redis://localhost:6379"
}

# TODO: Future scaling components (commented out for MVP)
# module "elasticache" {
#   source = "./modules/elasticache"
#   ...
# }
#
# module "s3" {
#   source = "./modules/s3"
#   ...
# }
#
# module "cloudfront" {
#   source = "./modules/cloudfront"
#   ...
# }
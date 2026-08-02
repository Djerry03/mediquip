import { Module } from '@nestjs/common';
import { TypeOrmModule } from '@nestjs/typeorm';
import { BannerEntity } from '../entities/banner.entity';
import { CampaignPageEntity } from '../entities/campaign-page.entity';
import { EmailCampaignEntity } from '../entities/email-campaign.entity';
import { ProductEntity } from '../entities/product.entity';
import { UserEntity } from '../entities/user.entity';
import { BannersController } from './banners.controller';
import { BannersService } from './banners.service';
import { CampaignPagesController } from './campaign-pages.controller';
import { CampaignPagesService } from './campaign-pages.service';
import { EmailCampaignsController } from './email-campaigns.controller';
import { EmailCampaignsService } from './email-campaigns.service';

@Module({
  imports: [
    TypeOrmModule.forFeature([
      BannerEntity,
      CampaignPageEntity,
      EmailCampaignEntity,
      ProductEntity,
      UserEntity,
    ]),
  ],
  controllers: [BannersController, CampaignPagesController, EmailCampaignsController],
  providers: [BannersService, CampaignPagesService, EmailCampaignsService],
  exports: [BannersService, CampaignPagesService, EmailCampaignsService],
})
export class MarketingModule {}

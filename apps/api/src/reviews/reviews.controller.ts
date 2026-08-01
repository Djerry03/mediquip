import { Body, Controller, Get, Param, Patch, Post, UseGuards } from '@nestjs/common';
import { Throttle } from '@nestjs/throttler';
import { ReviewsService } from './reviews.service';
import { CreateReviewDto, ModerateReviewDto } from './dto/review.dto';
import { JwtAuthGuard, Roles, RolesGuard } from '../auth/guards';
import { CurrentUser } from '../auth/current-user.decorator';
import { AuthenticatedUser } from '../auth/jwt.strategy';
import { UserRole } from '../entities/user.entity';

@Controller()
export class ReviewsController {
  constructor(private readonly reviews: ReviewsService) {}

  @Get('products/:productId/reviews')
  findPublished(@Param('productId') productId: string) {
    return this.reviews.findPublished(productId);
  }

  @UseGuards(JwtAuthGuard)
  @Throttle({ default: { ttl: 3_600_000, limit: 10 } })
  @Post('products/:productId/reviews')
  create(
    @Param('productId') productId: string,
    @Body() dto: CreateReviewDto,
    @CurrentUser() user: AuthenticatedUser,
  ) {
    return this.reviews.create(productId, dto, user);
  }

  @UseGuards(JwtAuthGuard, RolesGuard)
  @Roles(UserRole.ADMIN)
  @Get('reviews/pending')
  pending() {
    return this.reviews.findPending();
  }

  @UseGuards(JwtAuthGuard, RolesGuard)
  @Roles(UserRole.ADMIN)
  @Patch('reviews/:id')
  moderate(@Param('id') id: string, @Body() dto: ModerateReviewDto) {
    return this.reviews.moderate(id, dto);
  }
}

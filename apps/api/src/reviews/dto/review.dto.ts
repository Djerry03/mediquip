import { IsEnum, IsInt, IsString, Max, MaxLength, Min, MinLength } from 'class-validator';
import { ReviewStatus } from '../../entities/review.entity';

export class CreateReviewDto {
  @IsInt()
  @Min(1)
  @Max(5)
  rating: number;

  @IsString()
  @MinLength(10, { message: 'Votre avis doit contenir au moins 10 caractères.' })
  @MaxLength(1000)
  comment: string;
}

export class ModerateReviewDto {
  @IsEnum(ReviewStatus)
  status: ReviewStatus;
}

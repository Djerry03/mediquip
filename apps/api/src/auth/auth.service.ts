import {
  ConflictException,
  Injectable,
  NotFoundException,
  UnauthorizedException,
} from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { JwtService } from '@nestjs/jwt';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository } from 'typeorm';
import * as bcrypt from 'bcryptjs';
import { UserEntity, UserRole } from '../entities/user.entity';
import { ChangePasswordDto, LoginDto, RegisterDto, UpdateProfileDto } from './dto/auth.dto';

const BCRYPT_ROUNDS = 12;

export type PublicUser = {
  id: string;
  email: string;
  fullName: string;
  phone?: string;
  role: UserRole;
  defaultQuartierId?: string;
  defaultPointRepere?: string;
};

@Injectable()
export class AuthService {
  constructor(
    @InjectRepository(UserEntity)
    private readonly users: Repository<UserEntity>,
    private readonly jwt: JwtService,
    private readonly config: ConfigService,
  ) {}

  private toPublic(user: UserEntity): PublicUser {
    return {
      id: user.id,
      email: user.email,
      fullName: user.fullName,
      phone: user.phone,
      role: user.role,
      defaultQuartierId: user.defaultQuartierId,
      defaultPointRepere: user.defaultPointRepere,
    };
  }

  private sign(user: UserEntity) {
    return this.jwt.sign({ sub: user.id, email: user.email, role: user.role });
  }

  async register(dto: RegisterDto) {
    const existing = await this.users.findOne({ where: { email: dto.email } });
    if (existing) {
      throw new ConflictException('Un compte existe déjà avec cette adresse e-mail.');
    }

    const user = await this.users.save(
      this.users.create({
        email: dto.email,
        passwordHash: await bcrypt.hash(dto.password, BCRYPT_ROUNDS),
        fullName: dto.fullName,
        phone: dto.phone,
        // Le rôle n'est jamais accepté depuis la requête : toute inscription
        // publique crée un client, jamais un administrateur.
        role: UserRole.CUSTOMER,
      }),
    );

    return { token: this.sign(user), user: this.toPublic(user) };
  }

  async login(dto: LoginDto) {
    const user = await this.users.findOne({
      where: { email: dto.email },
      select: ['id', 'email', 'passwordHash', 'fullName', 'phone', 'role', 'defaultQuartierId', 'defaultPointRepere'],
    });

    // Message volontairement identique dans les deux cas : ne pas révéler
    // quelles adresses e-mail ont un compte.
    const invalid = new UnauthorizedException('E-mail ou mot de passe incorrect.');
    if (!user) {
      // Hachage à vide pour égaliser le temps de réponse et éviter de
      // distinguer « compte inexistant » de « mot de passe faux ».
      await bcrypt.compare(dto.password, '$2a$12$invalidinvalidinvalidinvalidinvalidinvalidinvalidinv');
      throw invalid;
    }

    if (!(await bcrypt.compare(dto.password, user.passwordHash))) throw invalid;

    return { token: this.sign(user), user: this.toPublic(user) };
  }

  async me(userId: string): Promise<PublicUser> {
    const user = await this.users.findOne({ where: { id: userId } });
    if (!user) throw new NotFoundException('Compte introuvable.');
    return this.toPublic(user);
  }

  async updateProfile(userId: string, dto: UpdateProfileDto): Promise<PublicUser> {
    const user = await this.users.findOne({ where: { id: userId } });
    if (!user) throw new NotFoundException('Compte introuvable.');

    Object.assign(user, dto);
    return this.toPublic(await this.users.save(user));
  }

  async changePassword(userId: string, dto: ChangePasswordDto) {
    const user = await this.users.findOne({
      where: { id: userId },
      select: ['id', 'passwordHash'],
    });
    if (!user) throw new NotFoundException('Compte introuvable.');

    if (!(await bcrypt.compare(dto.currentPassword, user.passwordHash))) {
      throw new UnauthorizedException('Mot de passe actuel incorrect.');
    }

    await this.users.update(userId, {
      passwordHash: await bcrypt.hash(dto.newPassword, BCRYPT_ROUNDS),
    });

    return { ok: true };
  }
}

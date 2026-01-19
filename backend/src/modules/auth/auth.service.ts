import { Injectable, UnauthorizedException } from '@nestjs/common';
import { JwtService } from '@nestjs/jwt';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository } from 'typeorm';
import * as bcrypt from 'bcrypt';
import { Admin } from '../../database/entities';

export interface JwtPayload {
  sub: string;
  username: string;
}

@Injectable()
export class AuthService {
  constructor(
    @InjectRepository(Admin)
    private adminRepository: Repository<Admin>,
    private jwtService: JwtService,
  ) {}

  async validateUser(username: string, password: string): Promise<Admin | null> {
    const admin = await this.adminRepository.findOne({
      where: { username, isActive: true },
    });

    if (admin && await bcrypt.compare(password, admin.password)) {
      return admin;
    }
    return null;
  }

  async login(username: string, password: string): Promise<{ accessToken: string; expiresIn: string }> {
    const admin = await this.validateUser(username, password);
    
    if (!admin) {
      throw new UnauthorizedException('Credenciais inválidas');
    }

    const payload: JwtPayload = { sub: admin.id, username: admin.username };
    
    return {
      accessToken: this.jwtService.sign(payload),
      expiresIn: '1h',
    };
  }

  async validateToken(payload: JwtPayload): Promise<Admin | null> {
    return this.adminRepository.findOne({
      where: { id: payload.sub, isActive: true },
    });
  }

  async changePassword(adminId: string, currentPassword: string, newPassword: string): Promise<boolean> {
    const admin = await this.adminRepository.findOne({ where: { id: adminId } });
    
    if (!admin) {
      throw new UnauthorizedException('Admin não encontrado');
    }

    const isValid = await bcrypt.compare(currentPassword, admin.password);
    if (!isValid) {
      throw new UnauthorizedException('Senha atual incorreta');
    }

    const hashedPassword = await bcrypt.hash(newPassword, 10);
    await this.adminRepository.update(adminId, { password: hashedPassword });
    
    return true;
  }
}

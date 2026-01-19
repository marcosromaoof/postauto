import { Injectable, NotFoundException } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository } from 'typeorm';
import { Prompt } from '../../database/entities';

@Injectable()
export class PromptsService {
  constructor(
    @InjectRepository(Prompt)
    private promptRepository: Repository<Prompt>,
  ) {}

  async getActive(): Promise<Prompt | null> {
    return this.promptRepository.findOne({
      where: { isActive: true },
      order: { version: 'DESC' },
    });
  }

  async getAll(): Promise<Prompt[]> {
    return this.promptRepository.find({
      order: { version: 'DESC' },
    });
  }

  async getById(id: string): Promise<Prompt> {
    const prompt = await this.promptRepository.findOne({ where: { id } });
    if (!prompt) {
      throw new NotFoundException('Prompt não encontrado');
    }
    return prompt;
  }

  async create(data: { basePrompt: string; editorialRules?: string }): Promise<Prompt> {
    // Desativar todos os prompts existentes
    await this.promptRepository.update({}, { isActive: false });

    // Obter a versão mais alta
    const lastPrompt = await this.promptRepository.findOne({
      order: { version: 'DESC' },
    });
    const newVersion = lastPrompt ? lastPrompt.version + 1 : 1;

    const prompt = this.promptRepository.create({
      basePrompt: data.basePrompt,
      editorialRules: data.editorialRules,
      language: 'pt-BR',
      version: newVersion,
      isActive: true,
    });

    return this.promptRepository.save(prompt);
  }

  async update(id: string, data: { basePrompt?: string; editorialRules?: string }): Promise<Prompt> {
    const prompt = await this.getById(id);
    
    // Criar nova versão ao invés de atualizar
    await this.promptRepository.update({}, { isActive: false });
    
    const newPrompt = this.promptRepository.create({
      basePrompt: data.basePrompt || prompt.basePrompt,
      editorialRules: data.editorialRules !== undefined ? data.editorialRules : prompt.editorialRules,
      language: 'pt-BR',
      version: prompt.version + 1,
      isActive: true,
    });

    return this.promptRepository.save(newPrompt);
  }

  async activate(id: string): Promise<Prompt> {
    await this.promptRepository.update({}, { isActive: false });
    await this.promptRepository.update(id, { isActive: true });
    return this.getById(id);
  }

  async buildPrompt(subject: string): Promise<string> {
    const activePrompt = await this.getActive();
    if (!activePrompt) {
      throw new NotFoundException('Nenhum prompt ativo encontrado');
    }

    let fullPrompt = activePrompt.basePrompt;
    
    if (activePrompt.editorialRules) {
      fullPrompt += `\n\nRegras Editoriais:\n${activePrompt.editorialRules}`;
    }

    fullPrompt += `\n\nAssunto: ${subject}`;

    return fullPrompt;
  }
}

import { PrismaClient } from '@prisma/client';
import bcrypt from 'bcryptjs';

const prisma = new PrismaClient();

async function main() {
  console.log('🌱 Seeding database...');

  // Crea admin user
  const adminPassword = await bcrypt.hash('admin123', 10);
  const admin = await prisma.user.upsert({
    where: { email: 'admin@europoligrafico.it' },
    update: {},
    create: {
      email: 'admin@europoligrafico.it',
      password: adminPassword,
      firstName: 'Admin',
      lastName: 'User',
      role: 'ADMIN',
      department: null,
      status: 'ACTIVE'
    }
  });

  // Utenti HR
  const riccardoPassword = await bcrypt.hash('user123', 10);
  const riccardo = await prisma.user.upsert({
    where: { email: 'riccardo@europoligrafico.it' },
    update: {},
    create: {
      email: 'riccardo@europoligrafico.it',
      password: riccardoPassword,
      firstName: 'Riccardo',
      lastName: 'Rossi',
      role: 'USER',
      department: 'HR',
      status: 'ACTIVE'
    }
  });

  const elisabettaPassword = await bcrypt.hash('user123', 10);
  const elisabetta = await prisma.user.upsert({
    where: { email: 'elisabetta@europoligrafico.it' },
    update: {},
    create: {
      email: 'elisabetta@europoligrafico.it',
      password: elisabettaPassword,
      firstName: 'Elisabetta',
      lastName: 'Bianchi',
      role: 'USER',
      department: 'HR',
      status: 'ACTIVE'
    }
  });

  // Utenti Amministrazione
  const silviaPassword = await bcrypt.hash('user123', 10);
  const silvia = await prisma.user.upsert({
    where: { email: 'silvia@europoligrafico.it' },
    update: {},
    create: {
      email: 'silvia@europoligrafico.it',
      password: silviaPassword,
      firstName: 'Silvia',
      lastName: 'Verdi',
      role: 'USER',
      department: 'Amministrazione',
      status: 'ACTIVE'
    }
  });

  const serenaPassword = await bcrypt.hash('user123', 10);
  const serena = await prisma.user.upsert({
    where: { email: 'serena@europoligrafico.it' },
    update: {},
    create: {
      email: 'serena@europoligrafico.it',
      password: serenaPassword,
      firstName: 'Serena',
      lastName: 'Neri',
      role: 'USER',
      department: 'Amministrazione',
      status: 'ACTIVE'
    }
  });

  const sandraPassword = await bcrypt.hash('user123', 10);
  const sandra = await prisma.user.upsert({
    where: { email: 'sandra@europoligrafico.it' },
    update: {},
    create: {
      email: 'sandra@europoligrafico.it',
      password: sandraPassword,
      firstName: 'Sandra',
      lastName: 'Gialli',
      role: 'USER',
      department: 'Amministrazione',
      status: 'ACTIVE'
    }
  });

  const patriziaPassword = await bcrypt.hash('user123', 10);
  const patrizia = await prisma.user.upsert({
    where: { email: 'patrizia@europoligrafico.it' },
    update: {},
    create: {
      email: 'patrizia@europoligrafico.it',
      password: patriziaPassword,
      firstName: 'Patrizia',
      lastName: 'Blu',
      role: 'USER',
      department: 'Amministrazione',
      status: 'ACTIVE'
    }
  });

  // Utente IT
  const marcoPassword = await bcrypt.hash('user123', 10);
  const marco = await prisma.user.upsert({
    where: { email: 'marco@europoligrafico.it' },
    update: {},
    create: {
      email: 'marco@europoligrafico.it',
      password: marcoPassword,
      firstName: 'Marco',
      lastName: 'Viola',
      role: 'USER',
      department: 'IT',
      status: 'ACTIVE'
    }
  });

  console.log('✅ Users created');

  // Crea board
  const board = await prisma.board.upsert({
    where: { id: 'default-board' },
    update: {},
    create: {
      id: 'default-board',
      name: 'Main Board',
      description: 'Board principale per gestione ticket'
    }
  });

  // Crea colonne
  const columns = await Promise.all([
    prisma.column.upsert({
      where: { id: 'col-todo' },
      update: {},
      create: {
        id: 'col-todo',
        boardId: board.id,
        name: 'To Do',
        order: 0
      }
    }),
    prisma.column.upsert({
      where: { id: 'col-progress' },
      update: {},
      create: {
        id: 'col-progress',
        boardId: board.id,
        name: 'In Progress',
        order: 1
      }
    }),
    prisma.column.upsert({
      where: { id: 'col-review' },
      update: {},
      create: {
        id: 'col-review',
        boardId: board.id,
        name: 'In Review',
        order: 2
      }
    }),
    prisma.column.upsert({
      where: { id: 'col-done' },
      update: {},
      create: {
        id: 'col-done',
        boardId: board.id,
        name: 'Done',
        order: 3
      }
    })
  ]);

  console.log('✅ Board and columns created');

  // Crea configurazioni SLA
  await Promise.all([
    prisma.sLAConfig.upsert({
      where: { category: 'Bug Critico' },
      update: {},
      create: {
        category: 'Bug Critico',
        priority: 'CRITICAL',
        hours: 4,
        description: 'Bug che blocca il sistema'
      }
    }),
    prisma.sLAConfig.upsert({
      where: { category: 'Bug Importante' },
      update: {},
      create: {
        category: 'Bug Importante',
        priority: 'HIGH',
        hours: 24,
        description: 'Bug che impatta funzionalità importanti'
      }
    }),
    prisma.sLAConfig.upsert({
      where: { category: 'Richiesta Onboarding' },
      update: {},
      create: {
        category: 'Richiesta Onboarding',
        priority: 'HIGH',
        hours: 24,
        description: 'Preparazione dotazioni per nuovo dipendente'
      }
    }),
    prisma.sLAConfig.upsert({
      where: { category: 'Richiesta Funzionalità' },
      update: {},
      create: {
        category: 'Richiesta Funzionalità',
        priority: 'MEDIUM',
        hours: 72,
        description: 'Nuova funzionalità richiesta'
      }
    }),
    prisma.sLAConfig.upsert({
      where: { category: 'Miglioramento' },
      update: {},
      create: {
        category: 'Miglioramento',
        priority: 'LOW',
        hours: 168,
        description: 'Miglioramento non urgente'
      }
    })
  ]);

  console.log('✅ SLA configs created');

  // Crea ticket di esempio
  const ticket1 = await prisma.ticket.create({
    data: {
      title: 'Implementare certificazione ISO 27001',
      description: 'Completare tutti i requisiti per la certificazione ISO 27001',
      boardId: board.id,
      columnId: columns[1].id,
      createdById: admin.id,
      assignedToId: riccardo.id,
      priority: 'HIGH',
      category: 'Richiesta Funzionalità',
      slaHours: 24,
      dueDate: new Date(Date.now() + 24 * 60 * 60 * 1000)
    }
  });

  await prisma.comment.create({
    data: {
      ticketId: ticket1.id,
      userId: admin.id,
      content: 'Iniziamo con l\'audit dei processi attuali.'
    }
  });

  const ticket2 = await prisma.ticket.create({
    data: {
      title: 'Setup processo onboarding',
      description: 'Creare template onboarding per nuovi dipendenti',
      boardId: board.id,
      columnId: columns[0].id,
      createdById: admin.id,
      priority: 'MEDIUM',
      category: 'Richiesta Funzionalità',
      slaHours: 72,
      dueDate: new Date(Date.now() + 72 * 60 * 60 * 1000)
    }
  });

  console.log('✅ Sample tickets created');

  console.log('\n🎉 Seed completed!\n');
  console.log('📧 Login credentials:');
  console.log('  Admin:      admin@europoligrafico.it / admin123');
  console.log('  Riccardo (HR):     riccardo@europoligrafico.it / user123');
  console.log('  Elisabetta (HR):   elisabetta@europoligrafico.it / user123');
  console.log('  Silvia (Admin):    silvia@europoligrafico.it / user123');
  console.log('  Serena (Admin):    serena@europoligrafico.it / user123');
  console.log('  Sandra (Admin):    sandra@europoligrafico.it / user123');
  console.log('  Patrizia (Admin):  patrizia@europoligrafico.it / user123');
  console.log('  Marco (IT):        marco@europoligrafico.it / user123\n');
}

main()
  .catch((e) => {
    console.error(e);
    process.exit(1);
  })
  .finally(async () => {
    await prisma.$disconnect();
  });

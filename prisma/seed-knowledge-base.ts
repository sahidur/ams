import { PrismaClient } from '@prisma/client';

const prisma = new PrismaClient();

// Default File Departments and Types as per requirements
const fileDepartments = [
  {
    name: 'MEL',
    description: 'Monitoring, Evaluation, and Learning',
    sortOrder: 1,
    fileTypes: [
      { name: 'Baseline', sortOrder: 1 },
      { name: 'Endline', sortOrder: 2 },
      { name: 'Impact Study', sortOrder: 3 },
      { name: 'VFM', sortOrder: 4 },
      { name: 'Case Study', sortOrder: 5 },
      { name: 'Research Document', sortOrder: 6 },
    ],
  },
  {
    name: 'Business Development',
    description: 'Business Development and Proposals',
    sortOrder: 2,
    fileTypes: [
      { name: 'ToR', description: 'Terms of Reference', sortOrder: 1 },
      { name: 'EOI', description: 'Expression of Interest', sortOrder: 2 },
      { name: 'Project File', sortOrder: 3 },
      { name: 'Agreement', sortOrder: 4 },
    ],
  },
  {
    name: 'Finance',
    description: 'Finance and Budget Documents',
    sortOrder: 3,
    fileTypes: [
      { name: 'Approved Budget', sortOrder: 1 },
      { name: 'Financial Proposal', sortOrder: 2 },
      { name: 'Budget Narrative', sortOrder: 3 },
    ],
  },
  {
    name: 'Communication',
    description: 'Communication and Media',
    sortOrder: 4,
    fileTypes: [
      { name: 'Media Coverage', sortOrder: 1 },
      { name: 'Photoshoot', sortOrder: 2 },
      { name: 'Audio Visual', sortOrder: 3 },
      { name: 'Video', sortOrder: 4 },
      { name: 'Motion Graphics', sortOrder: 5 },
    ],
  },
  {
    name: 'Data',
    description: 'Data and Analytics',
    sortOrder: 5,
    fileTypes: [
      { name: 'Product Agreement', sortOrder: 1 },
      { name: 'License Agreement', sortOrder: 2 },
      { name: 'Achievement Data', sortOrder: 3 },
    ],
  },
  {
    name: 'Operation',
    description: 'Operations and Field Management',
    sortOrder: 6,
    fileTypes: [
      { name: 'Project Location', sortOrder: 1 },
      { name: 'Staff Mapping', sortOrder: 2 },
    ],
  },
];

async function seedKnowledgeBase() {
  console.log('🌱 Seeding Knowledge Base metadata...');

  for (const dept of fileDepartments) {
    // Create or update department
    const department = await prisma.fileDepartment.upsert({
      where: { name: dept.name },
      update: {
        description: dept.description,
        sortOrder: dept.sortOrder,
      },
      create: {
        name: dept.name,
        description: dept.description,
        sortOrder: dept.sortOrder,
        isActive: true,
      },
    });

    console.log(`  ✅ Department: ${dept.name}`);

    // Create file types for this department
    for (const ft of dept.fileTypes) {
      await prisma.fileType.upsert({
        where: { name: ft.name },
        update: {
          description: (ft as { description?: string }).description || null,
          sortOrder: ft.sortOrder,
          departmentId: department.id,
        },
        create: {
          name: ft.name,
          description: (ft as { description?: string }).description || null,
          sortOrder: ft.sortOrder,
          departmentId: department.id,
          isActive: true,
        },
      });
      console.log(`    📄 File Type: ${ft.name}`);
    }
  }

  console.log('\n✨ Knowledge Base metadata seeding complete!');
}

async function main() {
  try {
    await seedKnowledgeBase();
  } catch (error) {
    console.error('Error seeding knowledge base:', error);
    throw error;
  } finally {
    await prisma.$disconnect();
  }
}

main();

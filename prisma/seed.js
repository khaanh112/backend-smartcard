import { PrismaClient } from '@prisma/client';
import bcrypt from 'bcrypt';

const prisma = new PrismaClient();

async function main() {
  console.log(' Starting database seeding...');

  // Create themes
  console.log('\n Creating themes...');
  
  const theme1 = await prisma.theme.upsert({
    where: { name: 'Modern Minimal' },
    update: {},
    create: {
      name: 'Modern Minimal',
      thumbnailUrl: '/themes/modern-minimal.png',
      configJson: JSON.stringify({
        description: 'Animated glassmorphism theme with modern aesthetics for all users',
        primaryColor: '#8B5CF6',
        secondaryColor: '#EC4899',
        colors: {
          primary: '#8B5CF6',
          secondary: '#EC4899',
          accent: '#06B6D4',
          background: '#FFFFFF',
          text: '#1E293B',
        },
        fonts: {
          heading: 'system-ui',
          body: 'system-ui',
        },
        layout: 'centered',
        cardStyle: 'rounded',
      }),
      isActive: true,
    },
  });
  console.log(` Created theme: ${theme1.name}`);

  const theme2 = await prisma.theme.upsert({
    where: { name: 'Professional Dark' },
    update: {},
    create: {
      name: 'Professional Dark',
      thumbnailUrl: '/themes/professional-dark.png',
      configJson: JSON.stringify({
        description: 'Elegant sidebar layout perfect for executives and businessmen',
        primaryColor: '#F59E0B',
        secondaryColor: '#D97706',
        colors: {
          primary: '#F59E0B',
          secondary: '#D97706',
          accent: '#FCD34D',
          background: '#111827',
          text: '#F9FAFB',
        },
        fonts: {
          heading: 'system-ui',
          body: 'system-ui',
        },
        layout: 'sidebar',
        cardStyle: 'rounded',
      }),
      isActive: true,
    },
  });
  console.log(` Created theme: ${theme2.name}`);

  const theme3 = await prisma.theme.upsert({
    where: { name: 'Creative Colorful' },
    update: {},
    create: {
      name: 'Creative Colorful',
      thumbnailUrl: '/themes/creative-colorful.png',
      configJson: JSON.stringify({
        description: 'Vibrant and energetic theme for sales and creative professionals',
        primaryColor: '#10B981',
        secondaryColor: '#8B5CF6',
        colors: {
          primary: '#10B981',
          secondary: '#8B5CF6',
          accent: '#F59E0B',
          background: '#FFFFFF',
          text: '#1F2937',
        },
        fonts: {
          heading: 'system-ui',
          body: 'system-ui',
        },
        layout: 'centered',
        cardStyle: 'rounded',
      }),
      isActive: true,
    },
  });
  console.log(` Created theme: ${theme3.name}`);

  const theme4 = await prisma.theme.upsert({
    where: { name: 'Corporate Blue' },
    update: {},
    create: {
      name: 'Corporate Blue',
      thumbnailUrl: '/themes/corporate-blue.png',
      configJson: JSON.stringify({
        description: 'Professional blue theme ideal for corporate settings',
        primaryColor: '#1E40AF',
        secondaryColor: '#3B82F6',
        colors: {
          primary: '#1E40AF',
          secondary: '#3B82F6',
          background: '#F8FAFC',
          text: '#0F172A',
        },
        fonts: {
          heading: 'Montserrat',
          body: 'Lato',
        },
        layout: 'centered',
        cardStyle: 'rounded',
      }),
      isActive: true,
    },
  });
  console.log(` Created theme: ${theme4.name}`);

  const theme5 = await prisma.theme.upsert({
    where: { name: 'Elegant Purple' },
    update: {},
    create: {
      name: 'Elegant Purple',
      thumbnailUrl: '/themes/elegant-purple.png',
      configJson: JSON.stringify({
        description: 'Elegant purple palette with refined typography',
        primaryColor: '#7C3AED',
        secondaryColor: '#A78BFA',
        colors: {
          primary: '#7C3AED',
          secondary: '#A78BFA',
          background: '#FAFAF9',
          text: '#292524',
        },
        fonts: {
          heading: 'Merriweather',
          body: 'Source Sans Pro',
        },
        layout: 'sidebar',
        cardStyle: 'rounded',
      }),
      isActive: true,
    },
  });
  console.log(` Created theme: ${theme5.name}`);

  // Create test users
  console.log('\n Creating test users...');
  
  const hashedPassword = await bcrypt.hash('Test1234', 10);
  
  const testUser1 = await prisma.user.upsert({
    where: { email: 'testuser@example.com' },
    update: {},
    create: {
      email: 'testuser@example.com',
      passwordHash: hashedPassword,
      fullName: 'John Doe',
    },
  });
  console.log(` Created user: ${testUser1.email}`);

  const testUser2 = await prisma.user.upsert({
    where: { email: 'demouser@example.com' },
    update: {},
    create: {
      email: 'demouser@example.com',
      passwordHash: hashedPassword,
      fullName: 'Jane Smith',
    },
  });
  console.log(` Created user: ${testUser2.email}`);

  // Create profile for testUser1 with complete data
  console.log('\n Creating profile for testuser@example.com...');
  
  const profile = await prisma.profile.upsert({
    where: { slug: 'john-doe' },
    update: {},
    create: {
      userId: testUser1.id,
      slug: 'john-doe',
      fullName: 'John Doe',
      title: 'Senior Full Stack Developer',
      phone: '+84 123 456 789',
      address: 'Ho Chi Minh City, Vietnam',
      avatarUrl: '/avatars/john-doe.jpg',
      themeId: theme1.id,
      isPublished: true,
    },
  });
  console.log(` Created profile: ${profile.slug}`);

  // Add work experiences
  console.log('\n Adding work experiences...');
  
  await prisma.workExperience.upsert({
    where: { id: 'exp-1-john' },
    update: {},
    create: {
      id: 'exp-1-john',
      profileId: profile.id,
      company: 'Tech Corp',
      position: 'Senior Full Stack Developer',
      startDate: new Date('2021-01-01'),
      endDate: null,
      description: 'Leading development of enterprise web applications using React, Node.js, and PostgreSQL. Mentoring junior developers and implementing best practices.',
      displayOrder: 1,
    },
  });

  await prisma.workExperience.upsert({
    where: { id: 'exp-2-john' },
    update: {},
    create: {
      id: 'exp-2-john',
      profileId: profile.id,
      company: 'StartUp Inc',
      position: 'Full Stack Developer',
      startDate: new Date('2019-06-01'),
      endDate: new Date('2020-12-31'),
      description: 'Built scalable web applications and RESTful APIs. Worked with modern JavaScript frameworks and cloud infrastructure.',
      displayOrder: 2,
    },
  });
  console.log(' Added 2 work experiences');

  // Add social links
  console.log('\n Adding social links...');
  
  await prisma.socialLink.upsert({
    where: { id: 'social-1-john' },
    update: {},
    create: {
      id: 'social-1-john',
      profileId: profile.id,
      platform: 'GITHUB',
      url: 'https://github.com/johndoe',
      displayOrder: 1,
    },
  });

  await prisma.socialLink.upsert({
    where: { id: 'social-2-john' },
    update: {},
    create: {
      id: 'social-2-john',
      profileId: profile.id,
      platform: 'LINKEDIN',
      url: 'https://linkedin.com/in/johndoe',
      displayOrder: 2,
    },
  });

  await prisma.socialLink.upsert({
    where: { id: 'social-3-john' },
    update: {},
    create: {
      id: 'social-3-john',
      profileId: profile.id,
      platform: 'EMAIL',
      url: 'mailto:john@example.com',
      displayOrder: 3,
    },
  });

  await prisma.socialLink.upsert({
    where: { id: 'social-4-john' },
    update: {},
    create: {
      id: 'social-4-john',
      profileId: profile.id,
      platform: 'WEBSITE',
      url: 'https://johndoe.dev',
      displayOrder: 4,
    },
  });
  console.log(' Added 4 social links');

  console.log('\n Database seeding completed successfully!');
  console.log('\nCreated:');
  console.log('  - 5 themes');
  console.log('  - 2 test users (password: Test1234)');
  console.log('  - 1 complete profile with work experience and social links');
}

main()
  .catch((e) => {
    console.error(' Error during seeding:', e);
    process.exit(1);
  })
  .finally(async () => {
    await prisma.$disconnect();
  });

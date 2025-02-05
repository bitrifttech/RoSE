const prisma = require('./prisma');
const bcrypt = require('bcrypt');

const SALT_ROUNDS = 10;

class UserService {
  async createUser(email, name) {
    return prisma.user.create({
      data: {
        email,
        name,
        settings: {
          create: {
            theme: 'dark'
          }
        }
      },
      include: {
        settings: true,
        projects: true
      }
    });
  }

  async registerUser(email, password, name) {
    // Check if user already exists
    const existingUser = await prisma.user.findUnique({
      where: { email }
    });

    if (existingUser) {
      throw new Error('User with this email already exists');
    }

    // Hash password
    const hashedPassword = await bcrypt.hash(password, SALT_ROUNDS);

    // Create user with hashed password
    return prisma.user.create({
      data: {
        email,
        password: hashedPassword,
        name,
        settings: {
          create: {
            theme: 'dark'
          }
        }
      },
      include: {
        settings: true,
        projects: true
      }
    });
  }

  async getUser(id) {
    return prisma.user.findUnique({
      where: { id },
      include: {
        settings: true,
        projects: {
          include: {
            settings: true
          }
        }
      }
    });
  }

  async getAllUsers() {
    return prisma.user.findMany({
      include: {
        settings: true,
        projects: {
          include: {
            settings: true
          }
        }
      }
    });
  }

  async updateUserSettings(userId, settings) {
    return prisma.userSettings.upsert({
      where: { userId },
      update: { settings },
      create: {
        userId,
        settings
      }
    });
  }
}

module.exports = new UserService();

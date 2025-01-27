const prisma = require('./prisma');

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

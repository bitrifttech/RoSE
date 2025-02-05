const prisma = require('./prisma');
const bcrypt = require('bcrypt');
const jwt = require('jsonwebtoken');

const SALT_ROUNDS = 10;
const JWT_SECRET = process.env.JWT_SECRET || 'your-secret-key'; // In production, always use environment variable

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

  async loginUser(email, password) {
    // Find user by email
    const user = await prisma.user.findUnique({
      where: { email },
      include: {
        settings: true,
        projects: {
          include: {
            settings: true
          }
        }
      }
    });

    if (!user) {
      throw new Error('Invalid email or password');
    }

    // Verify password
    const isPasswordValid = await bcrypt.compare(password, user.password);
    if (!isPasswordValid) {
      throw new Error('Invalid email or password');
    }

    // Generate JWT token
    const token = jwt.sign(
      { 
        userId: user.id,
        email: user.email
      },
      JWT_SECRET,
      { expiresIn: '24h' }
    );

    // Don't send password in response
    const { password: _, ...userWithoutPassword } = user;

    return {
      user: userWithoutPassword,
      token
    };
  }
}

module.exports = new UserService();

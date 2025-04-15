-- CreateTable
CREATE TABLE "User" (
    "id" VARCHAR(50) NOT NULL DEFAULT '',
    "userName" TEXT NOT NULL,
    "nickname" TEXT,
    "email" TEXT,
    "phoneNumber" TEXT,
    "wechatId" TEXT,
    "remarkInfo" TEXT,
    "lastLoginTime" TIMESTAMP(3),
    "lastLogoutTime" TIMESTAMP(3),
    "registrationTime" TIMESTAMP(3) NOT NULL,
    "companyName" TEXT,
    "openId" TEXT DEFAULT '',
    "headimgurl" TEXT,
    "newUser" BOOLEAN,
    "access" TEXT,
    "voice" VARCHAR(20),
    "speed" INTEGER NOT NULL,
    "is_delayed" BOOLEAN,
    "is_public" BOOLEAN,
    "deletedAt" TIMESTAMP(3),
    "createdAt" TIMESTAMP(3),
    "updatedAt" TIMESTAMP(3),
    "deletedBy" TEXT,
    "createdBy" VARCHAR(50),
    "updatedBy" VARCHAR(50),
    "tenantId" VARCHAR(50),
    "teamId" VARCHAR(50),
    "env" VARCHAR(50),

    CONSTRAINT "User_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "Articles" (
    "id" VARCHAR(50) NOT NULL DEFAULT '',
    "content" TEXT NOT NULL,
    "title" TEXT NOT NULL,
    "deletedAt" TIMESTAMP(3),
    "createdAt" TIMESTAMP(3),
    "updatedAt" TIMESTAMP(3),
    "deletedBy" TEXT,
    "createdBy" VARCHAR(50),
    "updatedBy" VARCHAR(50),
    "tenantId" VARCHAR(50),
    "teamId" VARCHAR(50),
    "env" VARCHAR(50),
    "userId" TEXT,

    CONSTRAINT "Articles_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "Sentences" (
    "id" VARCHAR(50) NOT NULL DEFAULT '',
    "content" TEXT NOT NULL,
    "articleId" TEXT,
    "deletedAt" TIMESTAMP(3),
    "createdAt" TIMESTAMP(3),
    "updatedAt" TIMESTAMP(3),
    "deletedBy" TEXT,
    "createdBy" VARCHAR(50),
    "updatedBy" VARCHAR(50),
    "tenantId" VARCHAR(50),
    "teamId" VARCHAR(50),
    "env" VARCHAR(50),

    CONSTRAINT "Sentences_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "Config" (
    "id" VARCHAR(50) NOT NULL DEFAULT '',
    "key" TEXT NOT NULL,
    "value" TEXT NOT NULL,
    "description" TEXT,
    "appName" TEXT,
    "deletedAt" TIMESTAMP(3),
    "createdAt" TIMESTAMP(3),
    "updatedAt" TIMESTAMP(3),
    "deletedBy" VARCHAR(50),
    "createdBy" VARCHAR(50),
    "updatedBy" VARCHAR(50),
    "tenantId" VARCHAR(50),
    "teamId" VARCHAR(50),

    CONSTRAINT "Config_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "UserPassword" (
    "id" VARCHAR(50) NOT NULL DEFAULT '',
    "password" TEXT,
    "deletedAt" TIMESTAMP(3),
    "createdAt" TIMESTAMP(3),
    "updatedAt" TIMESTAMP(3),
    "deletedBy" TEXT,
    "createdBy" TEXT,
    "updatedBy" TEXT,
    "tenantId" TEXT,
    "teamId" TEXT,

    CONSTRAINT "UserPassword_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "PhoneCode" (
    "id" VARCHAR(50) NOT NULL DEFAULT '',
    "code" TEXT,
    "userId" TEXT,
    "expiredTime" TIMESTAMP(3),
    "toPhoneNumber" TEXT,
    "deletedAt" TIMESTAMP(3),
    "createdAt" TIMESTAMP(3),
    "updatedAt" TIMESTAMP(3),
    "deletedBy" TEXT,
    "createdBy" TEXT,
    "updatedBy" TEXT,
    "tenantId" TEXT,
    "teamId" TEXT,

    CONSTRAINT "PhoneCode_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "EmailCode" (
    "id" VARCHAR(50) NOT NULL DEFAULT '',
    "code" TEXT,
    "userId" TEXT,
    "expiredTime" TIMESTAMP(3),
    "toEmail" TEXT,
    "deletedAt" TIMESTAMP(3),
    "createdAt" TIMESTAMP(3),
    "updatedAt" TIMESTAMP(3),
    "deletedBy" TEXT,
    "createdBy" TEXT,
    "updatedBy" TEXT,
    "tenantId" TEXT,
    "teamId" TEXT,

    CONSTRAINT "EmailCode_pkey" PRIMARY KEY ("id")
);

-- AddForeignKey
ALTER TABLE "Articles" ADD CONSTRAINT "Articles_userId_fkey" FOREIGN KEY ("userId") REFERENCES "User"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "Sentences" ADD CONSTRAINT "Sentences_articleId_fkey" FOREIGN KEY ("articleId") REFERENCES "Articles"("id") ON DELETE SET NULL ON UPDATE CASCADE;

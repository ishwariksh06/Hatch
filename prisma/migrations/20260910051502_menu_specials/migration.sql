-- RedefineTables
PRAGMA defer_foreign_keys=ON;
PRAGMA foreign_keys=OFF;
CREATE TABLE "new_FoodItem" (
    "id" TEXT NOT NULL PRIMARY KEY,
    "name" TEXT NOT NULL,
    "description" TEXT,
    "priceCents" INTEGER NOT NULL,
    "categoryId" TEXT NOT NULL,
    "available" BOOLEAN NOT NULL DEFAULT true,
    "isVeg" BOOLEAN NOT NULL DEFAULT true,
    "prepMinutes" INTEGER NOT NULL DEFAULT 10,
    "isSpecial" BOOLEAN NOT NULL DEFAULT false,
    "specialDay" INTEGER,
    "imageUrl" TEXT,
    "createdAt" DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" DATETIME NOT NULL,
    CONSTRAINT "FoodItem_categoryId_fkey" FOREIGN KEY ("categoryId") REFERENCES "Category" ("id") ON DELETE RESTRICT ON UPDATE CASCADE
);
INSERT INTO "new_FoodItem" ("available", "categoryId", "createdAt", "description", "id", "imageUrl", "isVeg", "name", "prepMinutes", "priceCents", "updatedAt") SELECT "available", "categoryId", "createdAt", "description", "id", "imageUrl", "isVeg", "name", "prepMinutes", "priceCents", "updatedAt" FROM "FoodItem";
DROP TABLE "FoodItem";
ALTER TABLE "new_FoodItem" RENAME TO "FoodItem";
PRAGMA foreign_keys=ON;
PRAGMA defer_foreign_keys=OFF;

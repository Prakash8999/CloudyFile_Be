import UserModel from "../models/UserModel";

type InputUser = {
  sharedWithUserId: number;
  sharedWithUserEmail: string;
  role: 'Reader' | 'Editor';
};

export const filterValidUsers = async (users: InputUser[]) => {
  // Step 1: Remove duplicate IDs (keep first occurrence)
  const uniqueMap = new Map<number, InputUser>();
  for (const user of users) {
    if (!uniqueMap.has(user.sharedWithUserId)) {
      uniqueMap.set(user.sharedWithUserId, user);
    }
  }
  const uniqueUsers = Array.from(uniqueMap.values());
  const idsToCheck = uniqueUsers.map(user => user.sharedWithUserId);

  // Step 2: Fetch valid IDs from the DB using Sequelize
  const existingUsers = await UserModel.findAll({
    where: { id: idsToCheck, block: false, isEmailVerified: true },
    attributes: ['id'],
    raw: true
  });
  const validIds = new Set(existingUsers.map((user:any) => user.id));

  // Step 3: Return only users whose ID exists in DB
  return uniqueUsers.filter(user => validIds.has(user.sharedWithUserId));
};





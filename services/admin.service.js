import User from "../models/User.js";
import { Invoice } from "../models/Invoice.js";




export async function getUsersWithMembers(req) {
  const {
    page = 1,
    limit = 10,
    search = "",
    status, // membership status from Membership collection
    plan,   // packageName from Membership collection
    role,   // user role filter if ever needed
    sortBy = "createdAt", // default sort on user.createdAt
    sortOrder = "desc",
  } = req.query;

  const pageNum = parseInt(page);
  const limitNum = parseInt(limit);
  const skip = (pageNum - 1) * limitNum;

  const pipeline = [];

  // Base user match (exclude admins by default unless role is provided explicitly)
  const baseMatch = {};
  if (role) {
    baseMatch.role = role;
  } else {
    baseMatch.role = { $ne: "admin" };
  }

  // Text-like search on user.name, user.email, and membershipNo
  if (search && String(search).trim() !== "") {
    const regex = new RegExp(String(search).trim(), "i");
    baseMatch.$or = [
      { name: regex },
      { email: regex },
      { membershipNo: regex },
    ];
  }

  pipeline.push({ $match: baseMatch });

  // Join with members collection
  pipeline.push(
    {
      $lookup: {
        from: "members",
        localField: "membershipNo",
        foreignField: "membershipNo",
        as: "memberData",
      },
    },
    { $unwind: { path: "$memberData", preserveNullAndEmptyArrays: true } }
  );

  // Join with memberships collection
  pipeline.push(
    {
      $lookup: {
        from: "memberships",
        localField: "membershipNo",
        foreignField: "membershipNo",
        as: "membershipData",
      },
    },
    { $unwind: { path: "$membershipData", preserveNullAndEmptyArrays: true } }
  );

  // Additional filters based on joined data
  const joinedMatch = {};
  if (status && String(status).trim() !== "") {
    joinedMatch["membershipData.membershipStatus"] = String(status).trim();
  }
  if (plan && String(plan).trim() !== "") {
    // plan maps to packageName in membershipData
    joinedMatch["membershipData.packageName"] = String(plan).trim();
  }
  if (Object.keys(joinedMatch).length > 0) {
    pipeline.push({ $match: joinedMatch });
  }

  // Sorting
  const sortStage = {};
  const order = String(sortOrder).toLowerCase() === "asc" ? 1 : -1;
  // allow sorting by a small whitelist
  const sortMap = {
    name: "name",
    email: "email",
    createdAt: "createdAt",
    membershipNo: "membershipNo",
    status: "membershipData.membershipStatus",
    plan: "membershipData.packageName",
    joinDate: "membershipData.JoinDate",
    expireDate: "membershipData.ExpireDate",
  };
  const sortField = sortMap[sortBy] || "createdAt";
  sortStage[sortField] = order;
  pipeline.push({ $sort: sortStage });

  // Facet to compute total after filters while also paginating results
  pipeline.push({
    $facet: {
      data: [{ $skip: skip }, { $limit: limitNum }],
      meta: [{ $count: "total" }]
    }
  });

  const [result] = await User.aggregate(pipeline);

  const data = result?.data ?? [];
  const total = (result?.meta?.[0]?.total) ?? 0;

  return {
    total,
    page: pageNum,
    limit: limitNum,
    data,
    totalPages: Math.ceil(total / (limitNum || 1)),
  };
}



export async function getMemberInvoices(memberId) {
  if (!memberId) return null; 
  return await Invoice.find({membershipNo:memberId});
}

import * as adminService from "../services/admin.service.js";

import Membership from "../models/MemberShip.js"; 
import StageData from "../models/StageData.js";
import Organization from "../models/Organization.js";
import User from "../models/User.js";


export const getallMembers = async (req, res, next) => {
  try {
    const result = await adminService.getUsersWithMembers(req);
    return res.status(200).json({ success: true, ...result });
  } catch (err) {
    next(err);
  }
};


// refer this controller for production 

export const getMemberInvoice = async (req, res, next) => {
  try {

    const memberId = req.params.memberId;
    if(!memberId){
        return res.status(400).json({
            success:false,
            message:"No memberId provided"
        });
    }

    const invoices = await adminService.getMemberInvoices(memberId);
    if(!invoices || invoices.length===0){
        return res.status(404).json({
            success:false,
            message:"No invoice Found for this memeber",
            result : []
        });
    }

    return res.status(200).json({ success: true, result:invoices});
  } catch (err) {
    next(err);
  }
};




const parseDateValue = (value) => {
  if (value === undefined || value === null || value === "") {
    return undefined;
  }

  const parsed = new Date(value);
  if (Number.isNaN(parsed.getTime())) {
    return undefined;
  }

  return parsed;
};

export const getMemberOrganization = async (req, res, next) => {
  try {
    const { memberId } = req.params;

    if (!memberId) {
      return res.status(400).json({
        success: false,
        message: "Member id is required",
      });
    }

    const organization = await Organization.findOne({ owner: memberId });

    if (!organization) {
      return res.status(404).json({
        success: false,
        message: "Organization not found for this member",
      });
    }

    return res.status(200).json({
      success: true,
      data: organization,
    });
  } catch (err) {
    next(err);
  }
};

export const updateMemberOrganization = async (req, res, next) => {
  try {
    const { memberId } = req.params;

    if (!memberId) {
      return res.status(400).json({
        success: false,
        message: "Member id is required",
      });
    }

    const organization = await Organization.findOne({ owner: memberId });

    if (!organization) {
      return res.status(404).json({
        success: false,
        message: "Organization not found for this member",
      });
    }

    const {
      gender,
      name,
      email,
      entityName,
      companyName,
      website,
      dateOfBirth,
      state,
      country,
      phone,
      countryCode,
      personalPhone,
      personalCountryCode,
      officeAddress,
      pincode,
      category,
      gstNumber,
      turnover,
      udyamRegistrationNo,
      businessType,
      established,
      businessEmail,
      msmeType,
      aboutUs,
      termsAccepted,
      tags,
      logoUrl,
      bannerUrl,
      description,
      address,
      plan,
    } = req.body ?? {};

    if (gender !== undefined) organization.gender = gender || undefined;
    if (name !== undefined) organization.name = name;
    if (entityName !== undefined) organization.entityName = entityName;
    if (companyName !== undefined) organization.companyName = companyName;
    if (website !== undefined) organization.website = website;

    if (dateOfBirth !== undefined) {
      organization.dateOfBirth = parseDateValue(dateOfBirth);
    }

    if (state !== undefined) organization.state = state;
    if (country !== undefined) organization.country = country;
    if (phone !== undefined) organization.phone = phone;
    if (countryCode !== undefined) organization.countryCode = countryCode || "+91";
    if (personalPhone !== undefined) organization.personalPhone = personalPhone;
    if (personalCountryCode !== undefined) {
      organization.personalCountryCode = personalCountryCode || "+91";
    }
    if (officeAddress !== undefined) organization.officeAddress = officeAddress;
    if (pincode !== undefined) organization.pincode = pincode;
    if (category !== undefined) organization.category = category;
    if (gstNumber !== undefined) organization.gstNumber = gstNumber;
    if (turnover !== undefined) organization.turnover = turnover;
    if (udyamRegistrationNo !== undefined) {
      organization.udyamRegistrationNo = udyamRegistrationNo;
    }
    if (businessType !== undefined) organization.businessType = businessType;

    if (established !== undefined) {
      organization.established = parseDateValue(established);
    }

    if (businessEmail !== undefined) organization.businessEmail = businessEmail;
    if (msmeType !== undefined) organization.msmeType = msmeType;
    if (aboutUs !== undefined) organization.aboutUs = aboutUs;
    if (termsAccepted !== undefined) {
      organization.termsAccepted = Boolean(termsAccepted);
    }
    if (tags !== undefined) {
      organization.tags = Array.isArray(tags) ? tags.slice(0, 4) : [];
    }
    if (logoUrl !== undefined) organization.logoUrl = logoUrl;
    if (bannerUrl !== undefined) organization.bannerUrl = bannerUrl;
    if (description !== undefined) organization.description = description;
    if (email !== undefined) organization.email = email;
    if (address !== undefined) organization.address = address;
    if (plan !== undefined) organization.plan = plan;

    await organization.save();

    const userUpdates = {};
    if (typeof name === "string" && name.trim()) {
      userUpdates.name = name.trim();
    }
    if (typeof email === "string" && email.trim()) {
      userUpdates.email = email.trim();
    }

    if (Object.keys(userUpdates).length > 0) {
      await User.findByIdAndUpdate(memberId, userUpdates, { new: false });
    }

    return res.status(200).json({
      success: true,
      data: organization,
    });
  } catch (err) {
    next(err);
  }
};


export const migrateMembership = async (req, res, next) => {
  try {
    const stageDocs = await StageData.find({});
    if (!stageDocs.length) {
      return res.status(404).json({ message: "No stage data found." });
    }
    
    const batchSize = 100;
    let batchMembership = [];
    
    // Helper function to parse date string "20-May-22" format
    const parseCustomDate = (dateStr) => {
      if (!dateStr || dateStr === '-') return null;
      
      try {
        // Handle format like "20-May-22"
        const parts = dateStr.split('-');
        if (parts.length === 3) {
          const [day, month, year] = parts;
          
          // Convert month name to number
          const monthMap = {
            'Jan': 0, 'Feb': 1, 'Mar': 2, 'Apr': 3, 'May': 4, 'Jun': 5,
            'Jul': 6, 'Aug': 7, 'Sep': 8, 'Oct': 9, 'Nov': 10, 'Dec': 11
          };
          
          const monthNum = monthMap[month];
          if (monthNum === undefined) return null;
          
          // Convert 2-digit year to 4-digit (assuming 20xx)
          const fullYear = year.length === 2 ? `20${year}` : year;
          
          return new Date(parseInt(fullYear), monthNum, parseInt(day));
        }
        
        // Fallback: try to parse as regular date
        return new Date(dateStr);
      } catch (error) {
        console.warn(`Failed to parse date: ${dateStr}`, error);
        return null;
      }
    };

    for (let i = 0; i < stageDocs.length; i++) {
      const doc = stageDocs[i];
      
      // Parse dates properly
      const joinDate = parseCustomDate(doc.JoinDate);
      const expireDate = parseCustomDate(doc.ExpireDate);
      
      // Status calculation logic with proper date comparison
      const now = new Date();
      let status = "Active"; // default status
      
      if (expireDate) {
        // Set time to end of day for expiration date comparison
        const expireDateEndOfDay = new Date(expireDate);
        expireDateEndOfDay.setHours(23, 59, 59, 999);
        
        status = now > expireDateEndOfDay ? "Expired" : "Active";
      }
      
      const membership = {
        membershipNo: doc.MembershipNo,
        membershipStatus: status,
        JoinDate: joinDate, // Store as proper Date object
        ExpireDate: expireDate, // Store as proper Date object
        packageName: doc.FirstPackageName,
      };
      
      batchMembership.push(membership);
      
      // Insert in batches
      if (batchMembership.length === batchSize || i === stageDocs.length - 1) {
        try {
          await Membership.insertMany(batchMembership, { ordered: false });
          console.log(`Inserted batch of ${batchMembership.length} memberships`);
        } catch (insertError) {
          console.error("Batch insert error:", insertError);
          // Continue with next batch instead of failing completely
        }
        batchMembership = [];
      }
    }
    
    return res
      .status(200)
      .json({ message: "Membership migration completed successfully." });
      
  } catch (error) {
    console.error("Migration error:", error);
    return res.status(500).json({ message: "Migration failed", error: error.message });
  }
};











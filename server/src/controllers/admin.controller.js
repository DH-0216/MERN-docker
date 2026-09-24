import {
  getDashboardStats,
  getUsersList,
  updateUserRole,
  deleteUserById,
  createAdminUser,
} from "../services/admin.service.js";

export const getStats = async (req, res, next) => {
  try {
    const stats = await getDashboardStats();
    res.status(200).json({
      success: true,
      message: "Admin statistics retrieved successfully",
      data: stats,
    });
  } catch (error) {
    next(error);
  }
};

export const listUsers = async (req, res, next) => {
  try {
    const { page, limit, search, role, sortBy, sortOrder } = req.query;
    const result = await getUsersList({
      page,
      limit,
      search,
      role,
      sortBy,
      sortOrder,
    });

    res.status(200).json({
      success: true,
      message: "Users retrieved successfully",
      data: result,
    });
  } catch (error) {
    next(error);
  }
};

export const changeUserRole = async (req, res, next) => {
  try {
    const { id } = req.params;
    const { role } = req.body;
    const requestingAdminId = req.user._id;

    const updatedUser = await updateUserRole(id, role, requestingAdminId);

    res.status(200).json({
      success: true,
      message: `User role updated to ${role} successfully`,
      data: updatedUser,
    });
  } catch (error) {
    next(error);
  }
};

export const removeUser = async (req, res, next) => {
  try {
    const { id } = req.params;
    const requestingAdminId = req.user._id;

    const result = await deleteUserById(id, requestingAdminId);

    res.status(200).json({
      success: true,
      message: "User deleted successfully",
      data: result,
    });
  } catch (error) {
    next(error);
  }
};

export const createUser = async (req, res, next) => {
  try {
    const { userName, email, password, role } = req.body;
    const result = await createAdminUser({ userName, email, password, role });

    res.status(201).json({
      success: true,
      message: "User created successfully",
      data: result,
    });
  } catch (error) {
    next(error);
  }
};

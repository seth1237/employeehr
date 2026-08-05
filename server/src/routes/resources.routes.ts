import { Router } from "express";
import { authMiddleware, AuthenticatedRequest } from "../middleware/auth";
import { ResourceProduct } from "../models/ResourceProduct";
import { ResourceDepartment } from "../models/ResourceDepartment";
import { ResourceAllocation } from "../models/ResourceAllocation";
import { User } from "../models/User";

const router = Router();

// ==================== PRODUCTS ====================

router.get("/products", authMiddleware, async (req: AuthenticatedRequest, res) => {
  try {
    const companyId = req.user?.org_id;
    if (!companyId) return res.status(400).json({ error: "Company ID not found" });

    const products = await ResourceProduct.find({ company_id: companyId }).sort({ createdAt: -1 });
    return res.json(products);
  } catch (error) {
    console.error("Error fetching products:", error);
    return res.status(500).json({ error: "Failed to fetch products" });
  }
});

router.post("/products", authMiddleware, async (req: AuthenticatedRequest, res) => {
  try {
    const companyId = req.user?.org_id;
    if (!companyId) return res.status(400).json({ error: "Company ID not found" });

    const { name, description, category, quantity_total, quantity_available, purchase_date, cost, serial_number, location } = req.body;

    if (!name || !category || quantity_total === undefined) {
      return res.status(400).json({ error: "Name, category, and quantity_total are required" });
    }

    const product = new ResourceProduct({
      company_id: companyId,
      name,
      description,
      category,
      quantity_total,
      quantity_available: quantity_available || quantity_total,
      purchase_date,
      cost,
      serial_number,
      location,
      status: "active",
    });

    await product.save();
    return res.status(201).json(product);
  } catch (error) {
    console.error("Error creating product:", error);
    return res.status(500).json({ error: "Failed to create product" });
  }
});

router.put("/products/:id", authMiddleware, async (req: AuthenticatedRequest, res) => {
  try {
    const { id } = req.params;
    const companyId = req.user?.org_id;

    const product = await ResourceProduct.findOneAndUpdate(
      { _id: id, company_id: companyId },
      req.body,
      { new: true, runValidators: true }
    );

    if (!product) return res.status(404).json({ error: "Product not found" });
    return res.json(product);
  } catch (error) {
    console.error("Error updating product:", error);
    return res.status(500).json({ error: "Failed to update product" });
  }
});

router.delete("/products/:id", authMiddleware, async (req: AuthenticatedRequest, res) => {
  try {
    const { id } = req.params;
    const companyId = req.user?.org_id;

    const product = await ResourceProduct.findOneAndDelete({ _id: id, company_id: companyId });

    if (!product) return res.status(404).json({ error: "Product not found" });
    return res.json({ message: "Product deleted successfully" });
  } catch (error) {
    console.error("Error deleting product:", error);
    return res.status(500).json({ error: "Failed to delete product" });
  }
});

// ==================== DEPARTMENTS ====================

router.get("/departments", authMiddleware, async (req: AuthenticatedRequest, res) => {
  try {
    const companyId = req.user?.org_id;
    if (!companyId) return res.status(400).json({ error: "Company ID not found" });

    const departments = await ResourceDepartment.find({ company_id: companyId }).sort({ createdAt: -1 });
    return res.json(departments);
  } catch (error) {
    console.error("Error fetching departments:", error);
    return res.status(500).json({ error: "Failed to fetch departments" });
  }
});

router.post("/departments", authMiddleware, async (req: AuthenticatedRequest, res) => {
  try {
    const companyId = req.user?.org_id;
    if (!companyId) return res.status(400).json({ error: "Company ID not found" });

    const { name, description, manager_id, budget_allocation } = req.body;
    if (!name) return res.status(400).json({ error: "Department name is required" });

    let manager_name = "";
    if (manager_id) {
      const manager = await User.findById(manager_id);
      if (manager) {
        manager_name = `${manager.firstName || ""} ${manager.lastName || ""}`.trim();
      }
    }

    const department = new ResourceDepartment({
      company_id: companyId,
      name,
      description,
      manager_id,
      manager_name,
      budget_allocation: budget_allocation || 0,
      active: true,
    });

    await department.save();
    return res.status(201).json(department);
  } catch (error) {
    console.error("Error creating department:", error);
    return res.status(500).json({ error: "Failed to create department" });
  }
});

router.put("/departments/:id", authMiddleware, async (req: AuthenticatedRequest, res) => {
  try {
    const { id } = req.params;
    const companyId = req.user?.org_id;

    const department = await ResourceDepartment.findOneAndUpdate(
      { _id: id, company_id: companyId },
      req.body,
      { new: true, runValidators: true }
    );

    if (!department) return res.status(404).json({ error: "Department not found" });
    return res.json(department);
  } catch (error) {
    console.error("Error updating department:", error);
    return res.status(500).json({ error: "Failed to update department" });
  }
});

router.delete("/departments/:id", authMiddleware, async (req: AuthenticatedRequest, res) => {
  try {
    const { id } = req.params;
    const companyId = req.user?.org_id;

    const department = await ResourceDepartment.findOneAndDelete({ _id: id, company_id: companyId });

    if (!department) return res.status(404).json({ error: "Department not found" });
    return res.json({ message: "Department deleted successfully" });
  } catch (error) {
    console.error("Error deleting department:", error);
    return res.status(500).json({ error: "Failed to delete department" });
  }
});

// ==================== ALLOCATIONS ====================

router.get("/allocations", authMiddleware, async (req: AuthenticatedRequest, res) => {
  try {
    const companyId = req.user?.org_id;
    if (!companyId) return res.status(400).json({ error: "Company ID not found" });

    const allocations = await ResourceAllocation.find({ company_id: companyId }).sort({ allocation_date: -1 });
    return res.json(allocations);
  } catch (error) {
    console.error("Error fetching allocations:", error);
    return res.status(500).json({ error: "Failed to fetch allocations" });
  }
});

router.post("/allocations", authMiddleware, async (req: AuthenticatedRequest, res) => {
  try {
    const companyId = req.user?.org_id;
    if (!companyId) return res.status(400).json({ error: "Company ID not found" });

    const { product_id, employee_id, department_id, allocation_date } = req.body;

    if (!product_id || !employee_id || !department_id) {
      return res.status(400).json({ error: "Product ID, employee ID, and department ID are required" });
    }

    const product = await ResourceProduct.findById(product_id);
    if (!product) return res.status(404).json({ error: "Product not found" });
    if (product.quantity_available <= 0) return res.status(400).json({ error: "Product not available" });

    const employee = await User.findById(employee_id);
    if (!employee) return res.status(404).json({ error: "Employee not found" });

    const department = await ResourceDepartment.findById(department_id);
    if (!department) return res.status(404).json({ error: "Department not found" });

    const employeeName = `${employee.firstName || ""} ${employee.lastName || ""}`.trim();
    const allocation = new ResourceAllocation({
      company_id: companyId,
      product_id,
      product_name: product.name,
      employee_id,
      employee_name: employeeName,
      department_id,
      department_name: department.name,
      allocation_date: allocation_date || new Date(),
      status: "allocated",
      is_returned: false,
    });

    await allocation.save();

    product.quantity_available -= 1;
    await product.save();

    return res.status(201).json(allocation);
  } catch (error) {
    console.error("Error creating allocation:", error);
    return res.status(500).json({ error: "Failed to create allocation" });
  }
});

router.put("/allocations/:id/return", authMiddleware, async (req: AuthenticatedRequest, res) => {
  try {
    const { id } = req.params;
    const companyId = req.user?.org_id;
    const { return_date, condition_on_return, employee_remark } = req.body;

    if (!condition_on_return) return res.status(400).json({ error: "Condition on return is required" });

    const allocation = await ResourceAllocation.findOneAndUpdate(
      { _id: id, company_id: companyId },
      {
        return_date: return_date || new Date(),
        condition_on_return,
        employee_remark,
        is_returned: true,
        status: condition_on_return === "lost" ? "lost" : "returned",
      },
      { new: true, runValidators: true }
    );

    if (!allocation) return res.status(404).json({ error: "Allocation not found" });

    if (condition_on_return !== "lost") {
      const product = await ResourceProduct.findById(allocation.product_id);
      if (product) {
        product.quantity_available += 1;
        await product.save();
      }
    }

    const duration = Math.ceil(
      (new Date(return_date || new Date()).getTime() - new Date(allocation.allocation_date).getTime()) / (1000 * 60 * 60 * 24)
    );

    allocation.duration_days = duration;
    await allocation.save();

    return res.json(allocation);
  } catch (error) {
    console.error("Error returning allocation:", error);
    return res.status(500).json({ error: "Failed to return allocation" });
  }
});

router.get("/allocations/product/:productId/history", authMiddleware, async (req: AuthenticatedRequest, res) => {
  try {
    const { productId } = req.params;
    const companyId = req.user?.org_id;

    const history = await ResourceAllocation.find({
      company_id: companyId,
      product_id: productId,
      is_returned: true,
    }).sort({ return_date: -1 });

    return res.json(history);
  } catch (error) {
    console.error("Error fetching product history:", error);
    return res.status(500).json({ error: "Failed to fetch product history" });
  }
});

router.get("/allocations/employee/:employeeId/current", authMiddleware, async (req: AuthenticatedRequest, res) => {
  try {
    const { employeeId } = req.params;
    const companyId = req.user?.org_id;

    const allocations = await ResourceAllocation.find({
      company_id: companyId,
      employee_id: employeeId,
      is_returned: false,
    }).sort({ allocation_date: -1 });

    return res.json(allocations);
  } catch (error) {
    console.error("Error fetching employee allocations:", error);
    return res.status(500).json({ error: "Failed to fetch employee allocations" });
  }
});

export default router;

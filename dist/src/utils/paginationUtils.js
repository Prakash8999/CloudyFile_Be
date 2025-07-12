"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.paginateAndSort = void 0;
const paginateAndSort = async (model, filters = {}, page = 1, limit = 50, order, include = []) => {
    delete filters?.order;
    const offset = (page - 1) * limit;
    const params = {
        where: filters,
        limit: limit,
        offset: offset,
        include: include,
        distinct: true,
    };
    if (Array.isArray(order) && order.length > 0) {
        params.order = order;
    }
    const { count, rows } = await model.findAndCountAll(params);
    const totalPages = Math.ceil(count / limit);
    return {
        data: rows.map((record) => record.toJSON()),
        meta: {
            total_count: count,
            total_pages: totalPages,
            limit: limit,
            offset: offset,
            page: page,
        },
    };
};
exports.paginateAndSort = paginateAndSort;

import { Model, FindAndCountOptions, Includeable, Order } from "sequelize";

interface PaginationMeta {
    total_count: number;
    total_pages: number;
    limit: number;
    offset: number;
    page: number;
}

interface PaginatedResult<T> {
    data: T[];
    meta: PaginationMeta;
}

export const paginateAndSort = async <T extends Model>(
    model: { findAndCountAll: (options: FindAndCountOptions) => Promise<{ count: number; rows: T[] }> },
    filters: Record<string, any> = {},
    page: number = 1,
    limit: number = 50,
    order: Order ,
    include: Includeable[] = []
): Promise<PaginatedResult<T>> => {
    delete filters?.order;
    const offset = (page - 1) * limit;

    const params: FindAndCountOptions = {
        where: filters,
        limit: limit,
        offset: offset,
        include: include,
        distinct: true,
    };

    if (Array.isArray(order) && order.length > 0)  {
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

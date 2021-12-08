module.exports = ( sequelize, DataTypes ) => {
    const products = sequelize.define("products", {
        model: {
            type: DataTypes.STRING,
            allowNull: true
        },
        details: {
            type: DataTypes.STRING,
            allowNull: true
        },
        width: {
            type: DataTypes.STRING,
            allowNull: true
        },
        height: {
            type: DataTypes.STRING,
            allowNull: true
        },
        weight: {
            type: DataTypes.STRING,
            allowNull: true
        },
        price: {
            type: DataTypes.STRING,
            allowNull: true
        },
        brand: {
            type: DataTypes.STRING,
            allowNull: true
        },
        photo: {
            type: DataTypes.TEXT,
            allowNull: true
        },
        qrcode: {
            type: DataTypes.TEXT,
            allowNull: true
        },
    });
    return products
}
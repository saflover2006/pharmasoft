import { useState, useCallback } from 'react';
import type { Product } from '@repo/database';
import type { CartItem } from '../types';
import { isProductExpired, getDaysUntilExpiry } from '../constants';
import { validateCartStock } from '../utils/calculations';

/**
 * Custom hook for managing shopping cart state and operations
 */
export function useCart() {
    const [cart, setCart] = useState<CartItem[]>([]);

    /**
     * Add a product to the cart or increment quantity if already present
     */
    const addToCart = useCallback((product: Product, quantity: number = 1) => {
        // Check if product is expired
        if (isProductExpired(product.expiry_date)) {
            const daysExpired = Math.abs(getDaysUntilExpiry(product.expiry_date) || 0);
            alert(
                `⛔ CANNOT SELL EXPIRED PRODUCT\n\n` +
                `${product.commercial_name}\n` +
                `Expired ${daysExpired} day${daysExpired !== 1 ? 's' : ''} ago\n\n` +
                `This product cannot be sold for safety and legal reasons.`
            );
            return;
        }

        // Warn if expiring soon (within 7 days)
        const daysUntilExpiry = getDaysUntilExpiry(product.expiry_date);
        if (daysUntilExpiry !== null && daysUntilExpiry > 0 && daysUntilExpiry <= 7) {
            if (!confirm(
                `⚠️ EXPIRING SOON\n\n` +
                `${product.commercial_name}\n` +
                `Expires in ${daysUntilExpiry} day${daysUntilExpiry !== 1 ? 's' : ''}\n\n` +
                `Do you want to add this product to the cart?`
            )) {
                return;
            }
        }

        setCart((prevCart) => {
            const existingItem = prevCart.find((item) => item.product.id === product.id);

            if (existingItem) {
                return prevCart.map((item) =>
                    item.product.id === product.id
                        ? { ...item, quantity: item.quantity + quantity }
                        : item
                );
            }

            return [...prevCart, { product, quantity }];
        });
    }, []);

    /**
     * Update quantity for a specific product
     */
    const updateQuantity = useCallback((productId: number, quantity: number) => {
        if (quantity <= 0) {
            setCart((prev) => prev.filter((item) => item.product.id !== productId));
            return;
        }

        setCart((prev) =>
            prev.map((item) =>
                item.product.id === productId ? { ...item, quantity } : item
            )
        );
    }, []);

    /**
     * Remove a product from the cart
     */
    const removeFromCart = useCallback((productId: number) => {
        setCart((prev) => prev.filter((item) => item.product.id !== productId));
    }, []);

    /**
     * Clear all items from the cart
     */
    const clearCart = useCallback(() => {
        setCart([]);
    }, []);

    /**
     * Get a specific cart item by product ID
     */
    const getCartItem = useCallback(
        (productId: number): CartItem | undefined => {
            return cart.find((item) => item.product.id === productId);
        },
        [cart]
    );

    /**
     * Check if cart has valid stock for all items
     */
    const validateStock = useCallback(() => {
        return validateCartStock(cart);
    }, [cart]);

    const replaceCart = useCallback((items: CartItem[]) => {
        setCart(items);
    }, []);

    return {
        cart,
        addToCart,
        updateQuantity,
        removeFromCart,
        clearCart,
        replaceCart,
        getCartItem,
        validateStock,
    };
}

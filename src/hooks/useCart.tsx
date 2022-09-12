import { createContext, ReactNode, useContext, useState } from 'react';
import { toast } from 'react-toastify';
import { api } from '../services/api';
import { Product, Stock } from '../types';

interface CartProviderProps {
  children: ReactNode;
}

interface UpdateProductAmount {
  productId: number;
  amount: number;
}

interface CartContextData {
  cart: Product[];
  addProduct: (productId: number) => Promise<void>;
  removeProduct: (productId: number) => void;
  updateProductAmount: ({ productId, amount }: UpdateProductAmount) => void;
}

const CartContext = createContext<CartContextData>({} as CartContextData);

export function CartProvider({ children }: CartProviderProps): JSX.Element {
  const [cart, setCart] = useState<Product[]>(() => {
    const storagedCart = localStorage.getItem('@RocketShoes:cart');

    if (storagedCart) {
      return JSON.parse(storagedCart);
    }

    return [];
  });

  const addProduct = async (productId: number) => {
    try {



      const response = await api.get("/products");
      const products: Product[] = response.data;

      const product: Product = products.find((item) => {
        return item.id === productId
      })!

      const oldStoragedCart: Product[] = JSON.parse(localStorage.getItem('@RocketShoes:cart') || '[]');

      /* verifica se o item já existe no carrinho, se existir não inclui o item, apenas incrementa
      a quantidade do mesmo */

      const productAlreadyExists = oldStoragedCart.find((item) => {
        return item.id === productId
      });

      if (productAlreadyExists) {

        product.amount = productAlreadyExists.amount + 1

        const indexOldStoragedCart = oldStoragedCart.indexOf(productAlreadyExists);
        if (indexOldStoragedCart > -1) {
          oldStoragedCart.splice(indexOldStoragedCart, 1)
        }

      } else {
        // @ts-ignore: Object is possibly 'null'.
        product.amount = 1
      }

      const newStoragedCart = [...oldStoragedCart, product];

      /* fim verifica se o item já existe no carrinho */


      /* Verifica se existe estoque sufuciente para o produto  */

      const { data: stock } = await api.get<Stock>(`stock/${product.id}`);

      if (product.amount > stock.amount) {
        toast("Quantidade solicitada fora de estoque");
        return;
      }

      setCart(newStoragedCart);

      localStorage.setItem('@RocketShoes:cart', JSON.stringify(newStoragedCart));
    } catch (err: any) {
      toast(err.message)
    }
  };

  const removeProduct = async (productId: number) => {
    try {

      const cartsState = [...cart];

      /* Remove o item do array do carrinho no stado atual d*/
      cartsState.splice(cartsState.findIndex(e => e.id === productId), 1);
      // eslint-disable-next-line @typescript-eslint/no-unused-expressions
      /* adciona o novo array com o item removido no localStorage e no estado */
      localStorage.setItem('@RocketShoes:cart', JSON.stringify(cartsState));
      setCart(cartsState);


    } catch {
      toast.error('Erro na remoção do produto');
    }
  };

  const updateProductAmount = async ({
    productId,
    amount,
  }: UpdateProductAmount) => {
    try {
      const cartsState = [...cart];

      /* se a quantidade for igual a 0, sai imediatamente*/

      if (amount === 0) {
        return;
      }


      // verificar se existe a nova quantidade no estoque
      const { data: stock } = await api.get<Stock>(`stock/${productId}`);

      if (amount > stock.amount) {
        toast("Quantidade solicitada fora de estoque");
        return
      }

      /* Procura o índice do item que terá a quantidade alterada */
      const cartIndex = cartsState.findIndex(e => e.id === productId);

      cartsState[cartIndex].amount = amount;

      localStorage.setItem('@RocketShoes:cart', JSON.stringify(cartsState));
      setCart(cartsState);


    } catch {
      toast.error('Erro na alteração de quantidade do produto');
    }
  };

  return (
    <CartContext.Provider
      value={{ cart, addProduct, removeProduct, updateProductAmount }}
    >
      {children}
    </CartContext.Provider>
  );
}

export function useCart(): CartContextData {
  const context = useContext(CartContext);

  return context;
}

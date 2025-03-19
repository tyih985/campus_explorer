import { Request, Response } from "express";
import { Log } from "@ubccpsc310/project-support";
import { StatusCodes } from "http-status-codes";
import { IInsightFacade } from "../controller/IInsightFacade";
import InsightFacade from "../controller/InsightFacade";

export class Post {
	private static facade: IInsightFacade = new InsightFacade();

	public static async performQuery(req: Request, res: Response): Promise<void> {
		try {
			Log.info(`Server::query(..) - query: ${JSON.stringify(req.body)}`);
			const response = await Post.facade.performQuery(req.body);
			res.status(StatusCodes.OK).json({ result: response });
		} catch (err) {
			const errorMessage = err instanceof Error ? err.message : "InsightError";
			res.status(StatusCodes.BAD_REQUEST).json({ error: errorMessage });
		}
	}
}

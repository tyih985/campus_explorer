import { Request, Response } from "express";
import { Log } from "@ubccpsc310/project-support";
import { StatusCodes } from "http-status-codes";
import { IInsightFacade, InsightError } from "../controller/IInsightFacade";
import InsightFacade from "../controller/InsightFacade";

export class Delete {
	private static facade: IInsightFacade = new InsightFacade();

	public static async removeDataset(req: Request, res: Response): Promise<void> {
		try {
			Log.info(`Server::dataset(..) - params: ${JSON.stringify(req.params)}`);
			const response = await Delete.facade.removeDataset(req.params.id);
			res.status(StatusCodes.OK).json({ result: response });
		} catch (err) {
			let status: StatusCodes;
			if (err instanceof InsightError) {
				status = StatusCodes.BAD_REQUEST;
			} else {
				status = StatusCodes.NOT_FOUND;
			}
			res.status(status).json({ error: err });
		}
	}
}
